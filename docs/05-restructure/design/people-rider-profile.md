# people — rider (passenger) profile

**Two surfaces, one record.** The side sheet at `?entity=<id>` and the full page at
`/entity/:entityId`, rebuilt to the owner's two reference designs.

| | |
|---|---|
| Owner | product-designer |
| Builders | frontend-engineer (sheet), frontend-engineer (page), mock-data-engineer (data), utilities-engineer (helpers) |
| Files this spec governs | `src/shell/layers/ProfileLayer.tsx`, `src/screens/EntityPageScreen.tsx`, `src/components/profile/*` |
| Files this spec **requires a change to, owned elsewhere** | `src/components/PageHeader.tsx`, `src/components/PageShell.tsx` — see §13 |
| Reference record | `RDR-4002` (`src/data/fixtures/riders.ts:505`) |

Read `§2` (the pattern), then `§3` (the parity contract — this is the ruling everything else
hangs off), then your surface's section. `§15` is the numbered acceptance criteria. **`§16` is
owner amendment 3 — the rail's under-review caption loses a clause and re-uses a shipped string,
and the ⓘ tooltip is refused on both surfaces (D-RP-6). A builder waiting on it should read
`§16.2` and `§16.3` and nothing else first; the full argument is
[`people-captain-profile.md` §13](./people-captain-profile.md).**

---

## 1. Provenance and precedence

Everything below is decided against, in this order:

```
Rulings R1–R19  →  DESIGN.md §6.2 sanctioned deviations  →  §7–§9  →  §1–§5
```

Two things follow that people keep getting wrong on this screen:

- **D-2 is retired.** `DESIGN.md` §6.2: *"D-2 is retired — `DECISIONS.md` D7, measured not
  asserted… Its type-ramp and spacing-scale suspensions are void and may not be cited
  again."* Nobody may argue "density lets me make this smaller". The surviving departure is
  **D-2′** and it is about the page gutter and nothing else.
- **No §1–§5 pixel figure binds** (R13). Every measurement below is either a token, a ratio,
  or a measured Eyvar figure carried by name.

Reference evidence opened for this spec, cited where used:

| File | What it settles |
|---|---|
| the inherited capture | main + rail on a person record; identity facts live in the rail; the empty main card is one grey sentence with one action |
| the inherited capture | the money summary card; card-local actions (`Fulfill item`, `Create shipping label`) that navigate rather than mutate in place |
| the inherited capture | the three-up summary band: **sentence-case labels above values, divided by vertical rules** |
| the inherited capture | the timeline: date heading, a dot at the inline-start of each row, timestamp at the inline-end, no connecting rule. Also the **`Fraud analysis` rail card**, where a *risk level* renders as a labelled scale — never a badge, never red |

---

## 2. Pattern

**`DESIGN.md` §6.4 row:** `applicant-detail`, `corp-detail`, **`profile`** → *Two-column
detail: main + right rail summary, with timeline* — **§2.2, §3.8**.

Both surfaces are that pattern. The sheet is that pattern inside a modal; the page is that
pattern on a route. That is not a coincidence and it is the reason the two references look
like siblings rather than alternatives.

Governing sections, in full:

| Subject | Governs |
|---|---|
| The shell layer | `design/00-shell.md` **§6.1, §6.2** |
| Page shape | `design/00-shell.md` **§7.2**; `DESIGN.md` §2.2 |
| Page header | `design/00-shell.md` **§8** |
| The card / section chrome | `design/00-shell.md` §6.2; `DESIGN.md` §3.5 |
| Money and the movements table | `DESIGN.md` **§8.3, §8.3.1–§8.3.4** |
| Derived values (churn risk, lifetime value, trips used) | `DESIGN.md` **§8.2** |
| Timeline | `DESIGN.md` §3.8 |
| The four states | `design/00-shell.md` §11.1–§11.3; `docs/ref/states.md` |
| Blocked controls | **§11.2** — disabled in place, with a stated reason, never hidden |
| Arabic | `DESIGN.md` **§9.1, §9.2, §9.5, §9.6** |

**The screen fits its row.** Nothing here needs a new §6.4 entry.

---

## 3. THE RULING — one content contract, two presentations

> The owner's working position: *"the surfaces may arrange facts differently but may never
> disagree about a fact, and neither may show a fact the other cannot."*

**Ratified, with one amendment and four enforcement mechanisms.**

### 3.1 What `ProfileLayer.tsx`'s current rule actually protected

The header says:

> *"the same stack on both surfaces. `EntityPageScreen` renders the identical
> `<ProfileSections>` from the identical registry. Nothing is passed in, so nothing can be
> passed differently."*

That rule was written after a real failure: the drawer took a `sectionRenderers` prop that
`AppLayout` never passed and the page hardcoded its own fallback, so a healthy rider showed
eight cards each claiming to have failed. The rule fixed it by removing the seam.

But it fixed it by **freezing the layout**, and layout was never the thing at risk. What
drifted was *content* — which sections exist and what they render. Freezing the layout to
protect the content is a padlock on the wrong door: it forbids the two references while
still permitting someone to add a fact to one renderer that only one surface calls.

**So the rule is narrowed, not repealed.** It stops governing geometry and starts governing
facts, where the defect actually lived.

### 3.2 The amendment: facts have a *rank*, and rank is what the contract quantifies over

Strict set equality is the wrong test and `DESIGN.md` already says why. §8.3.3:

> *"The single-signed-column form is permitted only in a rail card ≤ 320 px… and such a card
> **MUST omit the running balance and link to the full ledger**."*

A running balance per posting therefore **must not** appear in the sheet's rail-sized money
list and **must** appear in the page's full ledger. A contract demanding identical fact sets
would make `DESIGN.md` self-contradictory. So:

| Rank | Rule |
|---|---|
| **`summary`** | Appears on **both** surfaces, with the same value from the same derivation. No exceptions. |
| **`detail`** | May be thinner on the sheet. Where it is, the sheet **states the shortfall in words and links to where the rest is** — never silently. |

There is no third rank, and **there is no "omit" anywhere**. Nothing in either surface's
placement vocabulary can express dropping a fact.

### 3.3 The three clauses

- **P1 — Same facts.** Every `summary` fact renders on both surfaces, from one builder.
- **P2 — No orphan detail.** A `detail` fact the sheet truncates is counted in words and
  linked. `profile.ledger.truncated` (`Showing 6 of 41 postings`) already exists and is the
  form.
- **P3 — No private facts.** Neither surface may render a fact the shared builder does not
  declare. A surface may choose *geometry*; it may not choose *content*.

### 3.4 How it is enforced — four mechanisms, none of them a convention

**(a) Two total placement maps, with no escape hatch in the union.**

```ts
// src/components/profile/placement.ts   ← new file, owned by frontend-engineer
export type SheetSlot = 'rail' | 'activity' | 'money' | 'identity'
export type PageSlot  = 'strip' | 'main' | 'side' | 'band'

export const SHEET_PLACEMENT: Readonly<Record<ProfileSectionKey, SheetSlot>> = { … }
export const PAGE_PLACEMENT:  Readonly<Record<ProfileSectionKey, PageSlot>>  = { … }
```

`Record<ProfileSectionKey, …>` over a closed union is the same device
`PROFILE_SECTION_RENDERERS` already uses: **a thirteenth section key without a placement
does not compile.** And because neither `SheetSlot` nor `PageSlot` has an `'omit'` member,
*there is no way to write down "this surface does not show that"*. That is the structural
answer to "by convention is what failed last time" — the failure mode has no syntax.

**(b) One fact builder per section, and it takes no surface argument.**

Every section renderer's facts come from a pure `factsFor…(record, t, language): Fact[]`
where `Fact` gains one field:

```ts
export interface Fact {
  id: FactId          // NEW — stable, dotted, never translated. `wallet.balance`
  rank: 'summary' | 'detail'   // NEW
  label: string
  value: ReactNode | null
}
```

The builder has no `surface` parameter, so it cannot branch. `FieldList`, `FactGrid`,
`MiniLedger` and `DataTable` are the four geometries the facts are *poured into*; the
pouring is the only thing a surface chooses.

**(c) A parity test that renders both surfaces and diffs the ids.**

`src/components/profile/parity.test.tsx`, one test, run over **every** rider fixture:

```
render sheet(RDR-4002)  → collect [data-fact] ids
render page(RDR-4002)   → collect [data-fact] ids
expect  summary(sheet) === summary(page)          // P1, set equality, both directions
expect  detail(sheet)  ⊆  detail(page)            // P2
expect  every section with detail(sheet) ⊂ detail(page)
        to render a [data-truncation] node        // P2's "in words"
expect  keys(SHEET_PLACEMENT) === keys(PAGE_PLACEMENT) === keys(PROFILE_SECTION_RENDERERS)
```

`data-fact={fact.id}` is emitted by `FieldList` / `FactGrid` / the ledger cell renderer —
three places, not sixty call sites. This is the mechanism that would have caught the original
`sectionRenderers` defect on the commit that introduced it.

**(d) Actions travel the same way, through `src/commands/`.**

The two references disagree about actions too (`Release` on the sheet, `Churn risk` and
`Assign a captain` on the page). The registry already exists and already solves exactly this
— its own header records the defect: *"the same operator was stopped in one surface and
allowed in the other"*. So:

- A rider's commands are declared once, in **`RIDER_COMMANDS`** (new; `src/commands/riders.ts`).
- Both surfaces call `resolveCommands(RIDER_COMMANDS, { kind: 'entity', entityType: 'rider' })`.
  Neither holds a list.
- `unavailableReason` is the **only** function that may answer "may I", so a refusal cannot
  be worded differently on two surfaces (CM-3).
- **A command renders at most once per surface**, at the place its *target* is named — §7.4.

### 3.5 What the contract immediately catches

Three divergences between the two reference drawings, found by applying it:

| The two references say | Ruling |
|---|---|
| Sheet eyebrow `● LIVE · REQUESTED 09:11`; page eyebrow `● OPEN RIGHT NOW` | One string, both surfaces: **`Open right now`**. The timestamp is already in the card's meta line on both. |
| Sheet meta row has four parts; page meta row has five (`joined 22 Jun 2026`) | One meta row, **five parts**, one builder, both surfaces. |
| Sheet lists movements under *Activity*; a *Money* tab also counts them | Money movements live in **Money only**; *Activity* is the event timeline. Against the real data that resolves to `Activity 3` / `Money 4` — the owner's own counts. See §6.4. |
| Sheet blocks `Release`; page does not offer it | **Neither offers it.** §8.3 |

### 3.6 The proof: the sheet's layout was rebuilt and not one fact moved

The owner reversed the modal instruction after this spec was written, and the sheet went from
a ~1232px two-column modal to a **480px single-column drawer** (§6.1). That is as complete a
layout change as this screen can have: the rail stopped being a rail, `beside` became `above`,
the separating edge changed axis, the scrim and the focus trap came and went, and one
deviation (D-RP-3) lapsed outright.

**Not one fact changed surface, value or rank.** §4's table did not move. The placement maps
did not move. The parity test did not move.

That is the whole argument for narrowing `ProfileLayer`'s rule from **geometry** to **facts**,
and it is worth keeping in front of anyone who wants to re-freeze the layout: had the original
rule still been in force — *"the same stack on both surfaces… nothing can be passed
differently"* — this reversal would have been illegal, and the sheet would have had to keep a
two-column arrangement that **measurably overflows its own box by 11px at 480** (§6.1). The
rule would have been protecting a geometry at the cost of the thing it was written to protect.

---

## 4. The shared fact table

`source` is the field the value comes from. `rank` is §3.2's. Nothing renders that is not
here; nothing here fails to render.

| id | Fact | Source | Rank | Sheet | Page |
|---|---|---|---|---|---|
| `id.name` | Name | `Rider.name` | summary | band | band |
| `id.kind` | Record kind + id | `ProfileRef.entityType` + `entityId` | summary | band eyebrow | band eyebrow |
| `id.phone` | Phone | `Rider.phone` | summary | band meta | band meta |
| `id.status` | Account status | `Rider.status` | summary | band meta | band meta |
| `id.tier` | Tier | `Rider.tier` | summary | band meta | band meta |
| `id.city` | City | `Rider.city` | summary | band meta | band meta |
| `id.joined` | Joined | `Rider.joinedAt` | summary | band meta | band meta |
| `wallet.balance` | Wallet balance | `Ledger.closingBalanceHalalas` | summary | rail · Wallet | strip · Money |
| `payments.underReview` | Payments under review | Σ `Payment.amountHalalas` where `isPendingSettlement(settlement)` | summary | rail · Wallet, below the rule | strip · Money, below the rule |
| `payments.underReview.ref` | Which payment, held since when | `Payment.id` + `capturedAt` | summary | rail · Wallet | strip · Money |
| `wallet.lifetime` | Lifetime value | `Rider.lifetimeValueHalalas` | summary | rail · Trips | strip · Money |
| `engagement.trips` | Trips completed | `Rider.totalTrips` | summary | rail · Trips | strip · Engagement |
| `engagement.quickRides` | Quick rides | `Rider.quickRides` | summary | rail · Trips | strip · Engagement |
| `engagement.lastTrip` | Last trip | `Rider.lastTripAt` | summary | rail · Trips | strip · Engagement |
| `engagement.since` | Counting since | `Rider.joinedAt` | summary | rail · Trips | strip · Engagement |
| `plan.standing` | Plan | `Subscription.status` | summary | rail · Plan | strip · Plan |
| `plan.endsOn` | Cycle ends | `Subscription.endsOn` | summary | rail · Plan | strip · Plan |
| `plan.tripsUsed` | Trips used | `tripsCompleted` / `tripsIncluded` | summary | rail · Plan | strip · Plan |
| `plan.name` | Plan name | `Subscription.planName` | summary | rail · Plan | strip · Plan |
| `plan.cycle` | Cycle dates | `startedOn` → `endsOn` | summary | rail · Plan | strip · Plan |
| `churn.level` | Churn risk | `Rider.churnRisk` | summary | rail · Churn | strip · Plan |
| `churn.reason` | Why | derived — §8.2 | summary | rail · Churn | strip · Plan |
| `trip.open.*` | The open trip: id, route, requested at, status, captain, fare | `Trip` | summary | Activity | main |
| `money.posting.<id>` | date · reference · description · direction · amount | `LedgerPosting` | summary | Money | main band |
| `money.posting.<id>.balance` | Balance after | `LedgerPosting.balanceAfterHalalas` | **detail** | — (§8.3.3) | main band |
| `money.boundary.opening` / `.closing` | Opening / closing balance | `Ledger` | **detail** | — (§8.3.3) | main band |
| `payments.<id>` | Payments | `Payment` | summary | Money | main |
| `history.<id>` | Movement log events | `Rider.movementLog` | summary | Activity | main |
| `id.gender` `id.address` `id.driverPref` | Identity detail | `Rider.*` | summary | Identity | side |
| `device.*` | Device, app language, last IP, IP location | `Rider.*` | summary | Identity | side |
| `absent.rating` `absent.renewalRate` `absent.lastTrip` | Not recorded | `null` fields | summary | Identity | side |
| `tickets.<id>` `complaints.<id>` | Tickets and complaints | `Ticket` / `Complaint` | summary | Activity | main |

**Only three fact ids are `detail`**, and all three are the running balance §8.3.3 removes
from a rail-sized money list. Everything else appears on both surfaces. That is the contract
doing very little work, which is the point: the references were already close to agreeing.

### 4.1 Section placement

| `ProfileSectionKey` | `SheetSlot` | `PageSlot` |
|---|---|---|
| `identity` | `identity` | `side` |
| `devices` | `identity` | `side` |
| `compliance` | `identity` | `side` |
| `trips` | `activity` | `main` |
| `movement` | `activity` | `main` |
| `tickets` | `activity` | `main` |
| `disputes` | `activity` | `main` |
| `fairness` | `activity` | `main` |
| `commitment` | `activity` | `main` |
| `wallet` | `money` | `band` |
| `payments` | `money` | `main` |
| `subscriptions` | `activity` | `main` |

The rationale, so a thirteenth key can be placed without asking: **Money holds the money
instruments — the wallet ledger and the payment records, and nothing else. Activity holds
anything with a lifecycle in time. Identity holds what the record is.**
The map is the truth; the heuristic is only its reason.

`subscriptions` sits in **Activity**, not Money. A plan cycle is a thing that happened over
time, and the plan's *money* summary is already in the rail. The owner's own drawn counts
confirm the split — see §6.4, where they resolve to exactly `Activity 3` and `Money 4`
against the real fixture.

The sheet's **rail** and the page's **strip** are not in this table on purpose. They are a
*projection* — derived summary figures — not a home. Every fact in them also has a section,
and the section is where its detail lives.

---

## 5. Shared chrome — the header band

Both surfaces open on the same band. **One component**, `ProfileBand`, in
`src/components/profile/ProfileBand.tsx`.

### 5.1 Ground and type

The owner asked for "dark green `--ev-brand`". **Ruled: `--ev-hero`, not `--ev-brand`.**

`--ev-brand` `#0c6944` is a **control** fill. A large surface painted in it is what
`--ev-brand-field` exists to distinguish, and `globals.css` says so in terms: *"lightness
means different things at 32px and at 560px."* `--ev-hero` `#1e332a` is already the
product's *record band* instrument, it does not invert in dark mode, and it ships the exact
four-rank foreground ramp this band needs, every ratio measured:

| Slot | Token | Utility | Ratio on `--ev-hero` |
|---|---|---|---|
| Name | `--ev-hero-fg` | `text-hero-foreground` | 13.44 : 1 AAA |
| Meta row | `--ev-hero-fg-2` | `text-hero-muted` | 8.61 : 1 AAA |
| Eyebrow | `--ev-hero-fg-3` | `text-hero-label` | 5.89 : 1 AA |
| Divider between meta items | `--ev-hero-line` | `border-hero-line` | 1.44 : 1 — structure, not text |
| A control resting on the band | `--ev-hero-2` | `bg-hero-2` | white on it 11.58 : 1 |

Type: name `text-band` (30px) `font-medium`; eyebrow `text-2xs font-medium uppercase
tracking-wider`; meta `text-sm`.

**The uppercase eyebrow is licensed here and nowhere else on this screen.** §6.3 **D18** bans
uppercase + letter-spacing on labels, nav headings and table headers. It does not reach the
band eyebrow, which is a distinct instrument with its own precedent in the product
(`MetricTile.tsx:229`, `text-2xs font-medium uppercase tracking-wider text-hero-label`) and
whose Arabic behaviour is already solved — `globals.css` zeroes the whole tracking scale
under `:root:lang(ar)`, and `uppercase` is a no-op in a script with no case.

**Every other uppercase label in both references is refused.** See §11.

### 5.2 Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────┐  bg-hero
│ RIDER · RDR-4002                                                        ✕    │  eyebrow / close
│                                                                              │
│ الجوهرة بنت عبد العزيز بن سعود آل مقرن العتيبي                                │  text-band
│                                                                              │
│ +966 59 448 7070 │ On demand │ New tier │ Riyadh │ Joined 22 Jun 2026        │  text-sm
└──────────────────────────────────────────────────────────────────────────────┘
  ▲ inline-start                                                  inline-end ▲
```

- The `✕` is **sheet only** and sits at `inset-block-start` + `inset-inline-end`. `×` never
  mirrors (§9.5).
- On the page the same inline-end area carries the action cluster instead — §7.3.
- The meta row is a flex row; each item after the first takes `border-inline-start
  border-hero-line` with `ps-3 ms-3`. **Never `border-l`.** The dividers follow reading order
  in both directions with no second rule.
- The band is **not** a `PageHeader` on the page. §8's slots 1–5 are satisfied inside it, in
  the same order, with the same content — the same move `BoardHero` already makes for metric
  boards, and for the same reason: a 24px `<h1>` above a dark band loses the argument about
  which of the two names the surface. **There is exactly one `<h1>` and it is the name.**

### 5.3 Every string in the band, final

| Slot | English | Key | Notes |
|---|---|---|---|
| Eyebrow | `Rider · RDR-4002` | `profile.band.eyebrow` = `{kind} · {id}` | Uppercased by CSS, not by the string |
| Name | *the record's* | — | `Rider.name`, verbatim |
| Meta 1 | `+966 59 448 7070` | — | `<bdi>` |
| Meta 2 | `On demand` | `people.riderStatus.onDemand` | |
| Meta 3 | `New tier` | `profile.meta.tier` = `{tier} tier` | Named param, never concatenated (§9.6) |
| Meta 4 | `Riyadh` | — | `Rider.city` |
| Meta 5 | `Joined 22 Jun 2026` | `profile.meta.joined` = `Joined {date}` | `day-month-year` |
| Close | `Close` | `shell.layer.close` | `aria-label`; sheet only |

---

## 6. Reference A — the side sheet, `?entity=<id>`

### 6.1 Surface

**Drawer, no scrim, focus not trapped. `--ev-drawer-w` 480px, anchored inline-end.**

**This reverses an earlier instruction and the reversal is recorded, not hidden.** The layer
shipped briefly as `presentation="modal"` (`side="overlay"`, scrim, focus trapped) on the
owner's instruction that the record *"should be full screen… more like popup"*. The owner has
since reversed it. `ProfileLayer` is `presentation="drawer"` again, and every clause the modal
suspended is **back in force**:

| Clause | Status |
|---|---|
| §6.1 / §5.5 — **no scrim**, the workspace stays legible and interactive (AC-20) | restored |
| §7.3.3 — *the scrim decides the trap*, so **no focus trap**; Tab leaves and continues into the page | restored |
| §5.5 — **a modal nested inside a drawer is forbidden** | restored, and it is now what licenses D-RP-4 |
| §6.2 — **the layer commits nothing** | restored; the footer is `Open full profile` alone (§6.8) |
| §9.5 — the enter transform mirrors, `+X` in LTR and `−X` in RTL | restored |

**Do not propose widening the drawer. It has been measured and refused twice.** The next
person to read §6.2 will see a single column where the reference draws two and reach for the
width. In order:

- `sheet.tsx` §1.2 / **C12** already refuses a wide drawer in writing: *"NOT 648px: at 1280px
  a 648px drawer leaves 552px of content, which is narrower than a detail page's main column
  and destroys the only reason a drawer beat a modal. Width is solved by the full-page escape
  at `/entity/:entityId`."* That escape is this sheet's own footer link.
- The two-column body was then measured directly, in Chromium at 1280 × 900 on `RDR-4002`,
  counting `scrollWidth > clientWidth` on every descendant:

| panel width | rail box | rail needs | overflowing elements |
|---|---|---|---|
| **480** | 159 | **170** | the rail, its ground, its first block, and the wallet figure — `200.00 SAR` wants **154** in a **126** box |
| 560 | 186 | 186 | one truncated caption |
| **640** | 213 | 213 | **none** |

  Two columns first become clean at **640px** — precisely the width C12 refuses. Restacked at
  480 the same sweep reports **zero** overflow, on all three tabs, at 1280 and 1440, in both
  directions.

So the layout changed and **no token, no `globals.css`, no `ShellLayer` and no `sheet.tsx`
changed with it.** That is the correct trade: a shared width token exists to be obeyed, and
one screen's arrangement is the cheaper thing to move.

### 6.2 Layout — one column: the summary above the detail

**Unconditional, not a `compact:` override.** `compact` is `@media (width < 768px)`, a
**viewport** query — a 480px panel inside a 1280px viewport never matches it, so a `compact:`
rule could not have restacked anything. There is one arrangement.

```
┌──────────────────────────────────────┐  ← --ev-drawer-w, 480
│  ProfileBand  (§5)              ✕    │
├──────────────────────────────────────┤
│  Wallet                              │  the summary — bg-muted, full width,
│  200.00 SAR                          │  blocks stacked, separated by a
│  Lifetime value 0.00 SAR             │  block-axis rule
│  · · · · · · · · · · · · · · · · · · │
│  Payments under review               │
│  98.00 SAR   ⟨ Held ⟩                │
│  PAY-6150 · held 23 Jun              │
│  ──────────────────────────────────  │
│  Plan                                │
│  Expired    ▭▭▭▭▭                    │
│  0 of 5 trips used                   │
│  Weekly Economy · 1–8 Jun            │
│  ──────────────────────────────────  │
│  Trips completed                     │
│  0        Since 22 Jun               │
│  ──────────────────────────────────  │
│  Churn risk                          │
│  High · Lapsed with nothing used     │
├──────────────────────────────────────┤
│  Activity 4 │ Money 4 │ Identity     │  the detail — bg-card
│  ──────────────────────────────────  │
│  ● Open right now                    │
│  ┌────────────────────────────────┐  │
│  │ حي حطين ← مستشفى الملك فيصل    │  │
│  │ TRP-9104 · 25 Jun 09:11        │  │
│  ├────────────────────────────────┤  │
│  │ No captain assigned yet        │  │
│  │            [ Assign a captain ]│  │
│  └────────────────────────────────┘  │
│  Earlier                             │
│  Account registered   22 Jun · Riyadh│
├──────────────────────────────────────┤
│  Open full profile                   │
└──────────────────────────────────────┘
```

- **Summary first, then detail.** A summary below its own detail is not a summary. The order
  is the one this spec already ordained for the one-column case, and nothing is dropped or
  reordered inside either part.
- The summary's separating edge is a **block-axis** rule (`border-b`), not an inline one. That
  is the whole mirroring cost of the restack: an inline edge is the thing that would have had
  to mirror, and there no longer is one.
- The body cancels `ShellLayer`'s 12px padding (`-m-3`) so the summary reads as a **ground**
  rather than as a card that failed to fill. The utility is symmetric and mirrors.
- Band and footer do not scroll; the body between them does.

**Nothing in §3 or §4 moved for this.** The rail became a stack, `beside` became `above`, and
**not one fact changed surface, value or rank.** That is the fact-rank contract doing exactly
what it was written for — see §3.5.

### 6.3 The summary — four blocks

One block shape, four instances, shared with the page's strip (§7.4). On the sheet they stack
full-width under the band; on the page they sit side by side in the three-up strip. **Same
component, same facts, same order — only the axis differs.**

```
Label            text-xs text-muted-foreground, sentence case
Value            text-kpi tabular-nums text-foreground        ← the figure
[aside]          a badge, a meter, or nothing
Caption          text-xs text-muted-foreground                ← always present
```

Blocks are separated by `border-block-end border-border`, not by cards. The ground is
`bg-muted` — see §11 D-RP-2. On the sheet the block-axis rule is the only separator; there is
no inline edge, and therefore nothing here to mirror.

| Block | Value | Aside | Caption |
|---|---|---|---|
| `Wallet` | `200.00` + `SAR` at `text-sm` beside it | — | `Lifetime value 0.00 SAR`, then the under-review group below a dotted rule — §6.3.1 |
| `Plan` | `Expired` | the trip meter (§6.6) | `0 of 5 trips used` then `Weekly Economy · 1–8 Jun` |
| `Trips completed` | `0` | — | `Since 22 Jun` |
| `Churn risk` | `High` | — | `Lapsed with nothing used` |

Notes that are rulings, not preferences:

- **The held 98.00 is not inside the wallet figure, and putting it there was the most
  consequential error in the reference.** §6.3.1.
- **`Expired` is neutral ink, not red.** `profile/domain.ts` already assigns
  `expired → neutral`, and R5a enumerates red's four permitted uses — a status word is not
  one of them. A fifth use needs a §6.2 row, which this spec may not write. The weight comes
  from the figure rank, not the hue.
- **`Churn risk` is not a badge.** See §8.1.
- **`Lifetime value 0.00 SAR` is a caption on the Wallet block, not its own block.** §8.3.1:
  zero renders `0.00 SAR`, never an em dash.
- **The `Churn risk` block is pinned to the rail's block-end** (`mt-auto`), as drawn. It is
  the only block whose position is fixed rather than ordered.

#### 6.3.1 The held 98.00 is not in the wallet — the correction that matters most

The reference puts `98.00 SAR HELD` inside the `Wallet` block, directly under `200.00`. That
composition asserts that 98.00 of the rider's 200.00 is frozen. **It is false**, and the
fixtures say so unambiguously:

| | |
|---|---|
| The wallet ledger | two postings, both **settled** credits — 120.00 and 80.00 top-ups. `closingBalanceHalalas` **20 000**, `pendingHalalas` **0**, `lifetimePostings` **2** |
| The 98.00 | `PAY-6150`, a **`Payment`** — `kind: 'quick-ride-fare'`, `settlement: 'held'`, `subscriptionId: null`, `tripId: null`, `postingId: null` |
| What it is | a fare the rider **paid**, captured and frozen for **fraud review** — the fixture's own words. `RDR-4002` shares an IP with another rider, and that correlation put the hold on |
| Whose money | not the rider's. It is money the platform has captured and not settled onward to `DRV-0206` |

So the rider's 200.00 is **fully available** and nothing is held out of it. The two numbers
are on two different ledgers and must never be summed, subtracted or stacked as one story.

**Rendering.** The held amount is a separate labelled group, below a dotted rule, at the
block-end of `Wallet` / the `Money` cell:

```
Wallet
200.00 SAR
Lifetime value 0.00 SAR
· · · · · · · · · · · · ·
Payments under review
98.00 SAR   ⟨ Held ⟩
PAY-6150 · held 23 Jun
```

- **The summary label is `Payments under review`, not `Held`.** `Held` sitting under a wallet
  balance reads as *held out of your balance*, which is the false statement this ruling
  exists to remove. `Under review` is what is actually true.
- **The badge on the payment's own row still reads `Held`, tone `warning`** — `fin.settlement.held`,
  the same word and tone every financials screen uses for `settlement: 'held'` (§8.3.4). No
  cross-surface divergence: a state badge on a record and a summary label are different
  things.
- The group is a **link** to `PAY-6150`'s row in the Money tab, so the operator can reach the
  payment without hunting.
- This is §8.3.4's own construction — *"a pending amount is not part of a balance… it MUST
  appear as a separate labelled line beneath it"* — applied across two ledgers rather than
  within one.
- **`Ledger.pendingHalalas` is `0` for this rider and no surface renders a `Pending` line
  from it.** The fixture comment at `payments.ts:641` claims this payment flows into
  `pendingHalalas`; it does not, and the claim is recorded for its owner in §13 D.

### 6.4 The tabs, and what the counts count

`ui/tabs`, restyled. Inside the detail column, never in the band (`components.md`).

**Counts — the ruling.**

1. **A tab's count is the number of records behind that tab. Never the number of rows shown.**
   `Paginated<T>.total`, `Ledger.totalPostings` — the figures the server knows. A count that
   changed when a list truncated would be a lie the truncation sentence then contradicts.
2. **A record is counted under exactly one tab**, decided by `SHEET_PLACEMENT`. The reference
   drawing counted the four wallet postings under *Money* **and** listed them under
   *Activity*. Ruled: the four postings live in **Money only**. *Activity* is the record's
   event timeline — trips, tickets, complaints, movement log — and money is not an event on
   it.
3. **A tab of fields carries no count.** *Identity* is a set of pairs, not a list of records,
   so it has no number. This is exactly what the reference drew, and it is now a rule.
4. **The count renders only when every section behind it has resolved.** No count while
   loading — not `0`, not a skeleton digit, nothing. `0` before the read returns is a false
   statement, and the reader cannot tell it from a real zero.
5. The count is a `Badge tone="neutral"`, not parentheses.

**The arithmetic, against the shipped data layer** — measured by running it, not assumed.
Two first-class resources now answer the two countable tabs, which is better than summing
sections and is what the counts are read from:

| Tab | Source | Count for `RDR-4002` |
|---|---|---|
| `Activity` | `getRiderTimeline().total` | **4** — trip requested, account registered, subscription expired, subscription started |
| `Money` | `getRiderMoneyMovements().movements.length` | **4** — 2 wallet top-ups + `PAY-6150` + `PAY-6151` |
| `Identity` | one record, not a list | **none** |

`Money 4` is exactly what the owner drew. **`Activity` is 4 and the owner drew 3**, and the
difference is correct rather than a defect: a subscription contributes **two** events to a
timeline — the cycle starting and the cycle expiring — where an earlier draft of this spec
counted the subscription as one record. A timeline counts events; that is what a timeline is.

The rule is unchanged and is the load-bearing part: **the count is the total behind the tab,
never the rows on screen.** `Activity 4` over `Showing 6 of 23.` reconciles by reading.

**The two collections are disjoint, and the data layer enforces it rather than this spec
promising it**: money is deliberately absent from the timeline resource, so a top-up cannot be
counted under both tabs.

Tab labels, final: `Activity` · `Money` · `Identity`. Sentence case, no counts in the string.

### 6.5 The open-trip card

The sheet's **one filled button** lives here, and on the sheet **it is disabled** (R3 caps the
count at one; §11.2 requires it be present and explained rather than removed). On the page the
same control is enabled and navigates. Both come from one declaration.

```
Open right now                                          ← eyebrow, text-xs, sentence case, ● static dot
┌──────────────────────────────────────────────────────────────────┐  bg-brand-lt, border, rounded-lg
│ حي حطين  ←  مستشفى الملك فيصل التخصصي                 0.00 SAR   │  route / fare
│ TRP-9104 · 25 Jun 09:11 · Requested                              │  text-xs muted
├──────────────────────────────────────────────────────────────────┤  border-t
│ No captain assigned yet                    [ Assign a captain ]  │
└──────────────────────────────────────────────────────────────────┘
```

- **"Open" has one definition, product-wide.** `OPEN_TRIP_STATUSES = ['requested',
  'assigned', 'en-route', 'in-trip', 'late']` — the complement of the three terminal
  statuses, so it cannot drift. `DispatchScreen`'s `ACTIVE_TRIP_STATUSES` is **correct for the
  dispatch board and wrong as a general answer** (it plots trips a captain is committed to;
  a `requested` trip has no captain and no position), and it is **renamed
  `DISPATCH_BOARD_STATUSES`** so the ambiguous word `active` stops answering two questions.
  Both constants live in one file with a comment saying they differ.
- **The newest open trip only.** More than one and the card carries
  `+{n} more open` linking to the Activity tab's trip list.
- **The dot does not pulse.** R18 licences an ambient loop only for *"this feed is live"*; a
  single record card is not a feed, and misapplying that licence is legacy defect D24. Static
  filled dot, `aria-hidden`, with the word `Open right now` carrying the meaning (§7.5).
- **The route is three nodes built from `Trip.pickup` and `Trip.destination`. Never
  `Trip.route`.** `Trip` carries all three fields, and `route` is a pre-joined display string
  with a hardcoded `→` inside it — `'حي حطين → مستشفى الملك فيصل التخصصي'` — which cannot
  mirror, cannot isolate its two halves, and cannot be translated. `pickup` and `destination`
  are populated on `TRP-9104`. See §10.2.
- Where `pickup` or `destination` is `null` (both are nullable), the card renders the single
  endpoint it has, labelled — never `route` as a fallback, and never a dangling arrow.
- `Assign a captain` **navigates**; it does not mutate here. See §7.4.
- Ground: `bg-brand-lt` (`--ev-brand-lt` `#e7f0ec`) — the pale green the reference draws, and
  an existing token with a measured 5.793 : 1 for `--ev-brand` on it.

### 6.6 The trip meter — the ruling on "five segments"

The reference draws five segments because the reference record's plan includes five trips.
**A fixed five is a defect the moment a plan includes four or eight**, so:

| `tripsIncluded` | Rendering |
|---|---|
| `1 … 12` | **Exactly `tripsIncluded` segments.** Filled segments = `min(tripsCompleted, tripsIncluded)`. |
| `> 12` | **No meter. A single linear `Progress` bar instead.** Past a dozen, counting segments is slower than reading the caption, and the caption is right there. |
| `0` | **No meter and no bar.** Caption reads `No trip allowance on this plan`. An empty meter would claim a quota that does not exist. |
| unlimited (`null`) | **No meter and no bar.** Caption reads `Unlimited trips`. |
| `tripsCompleted > tripsIncluded` | Meter fills completely; the caption reads the truth — `6 of 5 trips used`. **Never clamp the caption. Never grow a sixth segment.** |

- Segments: `h-1 rounded-[2px]`, `gap-1`, `flex-1` each. Filled `bg-foreground`, empty
  `bg-hairline-strong` (R19's licensed neutral is for resting control boundaries; an empty
  meter segment is a resting boundary of a control-shaped readout — **if the R19 owner
  refuses that reading, use `bg-border`**; recorded in §13 as an open question rather than
  assumed).
- **The meter is `aria-hidden="true"` in full.** The caption below it *is* the value, and it
  is always rendered. That removes the `aria-valuemax` problem in the over-delivery case
  entirely and satisfies §7.5 without a second carrier to maintain.
- **The caption is mandatory** and always names both numbers: `{used} of {included} trips
  used`, one key, two named params.

### 6.7 The Earlier list and the closing sentence

- **`EARLIER` → `Earlier`.** Sentence case (D18).
- Rows: `RowList` / `MiniLedger` shape — title at the inline-start, value at the inline-end,
  second line `date · reference`.
- **The reference's "signed amount" is refused.** §8.3.3 permits a single signed column in a
  rail card, but the page's ledger carries direction as a **column** (`Debit` / `Credit`), and
  two vocabularies for one fact across two surfaces is precisely what §3 forbids. So the
  amount is positive and the direction is the word `Debit` / `Credit` beneath it — which is
  what `MiniLedger`'s `PostingRow` already ships.
- **The composed closing sentence is deleted.** `No tickets, no device, no rating on this
  record. Registered 22 Jun in Riyadh, SA.` is (a) false for `RDR-4002`, whose fixture carries
  a device, and (b) built by concatenating clauses, which §9.6 forbids outright — a
  *conditional* concatenation is still a concatenation. Its two jobs are already done: absences
  are named by the `Not recorded:` group (§7.5), and `Joined 22 Jun 2026` and `Riyadh` are in
  the band's meta row on both surfaces.

### 6.8 The footer

```
┌─────────────────────────────────────┐
│  Open full profile                  │
└─────────────────────────────────────┘
   link, variant="link", inline-start
```

- `Open full profile` — `Button variant="link"`, inline-start, as §6.2 requires.
  **No `↗`.** §9.5 classifies `↗` as the *external-link* mark; this navigates in place, and
  teaching the operator that `↗` means nothing in particular costs more than the glyph buys.
- **Nothing else. The footer is the link alone**, which is exactly what §6.2's *"no primary
  — the layer commits nothing"* asks for, now that the clause is back in force with the
  drawer (§6.1).
- `Release 98.00` is **not** here and is not anywhere else — releasing a fraud-review hold is
  ruled out of scope for this surface (§8.3).
- `Renew plan` is **not** here either. It has no client operation (§13 C), and a command with
  no operation is not declared in `RIDER_COMMANDS` at all — so it is absent from both surfaces
  together. That is the contract working, not a gap.
- **`Assign a captain` survives, and it is in the BODY, not the footer.** §6.2's clause
  legislates the footer, which is now the link alone; and the control commits nothing in any
  case — there is no assign operation on the seam, so it is disabled on the sheet and
  navigates on the page (§7.4). §11.2 forbids hiding it, so hiding it was never the
  alternative to showing it.

---

## 7. Reference B — the full page, `/entity/:entityId`

### 7.1 Layout

```
┌─ content region ───────────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ←  ProfileBand (§5)                                                            │ │  band
│ └────────────────────────────────────────────────────────────────────────────────┘ │
│ ┌──────────────────┬──────────────────────┬──────────────────────────────────────┐ │
│ │ Money            │ Engagement           │ Plan                                 │ │  strip
│ │ 200.00 SAR       │ 0                    │ Expired                              │ │
│ │ in wallet        │ trips completed      │ ends 8 Jun                           │ │
│ │ Lifetime 0.00SAR │ 0 quick rides ·      │ ▭▭▭▭▭  0 of 5 trips used             │ │
│ │ · · · · · · · ·  │ last trip not        │ Churn risk High ·                    │ │
│ │ Under review     │ recorded             │ Lapsed with nothing used             │ │
│ │ 98.00 SAR ⟨Held⟩ │                      │                                      │ │
│ └──────────────────┴──────────────────────┴──────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────┐  ┌──────────────────────────────┐  │
│ │ Open right now                              │  │ Identity                     │  │
│ │ ┌─────────────────────────────────────────┐ │  │ Phone   +966 59 448 7070     │  │
│ │ │ حي حطين ← مستشفى...   0.00 SAR [Assign]│ │  │ Status  On demand            │  │
│ │ │ TRP-9104 · 25 Jun 09:11 · Requested ·   │ │  │ Tier    New                  │  │
│ │ │ No captain assigned                     │ │  │ City    Riyadh               │  │
│ │ └─────────────────────────────────────────┘ │  │ Gender  Female               │  │
│ │                                             │  │ Joined  22 Jun 2026          │  │
│ │ History                                     │  │ Address حي حطين، …           │  │
│ │  ● 22 Jun  Account registered · Riyadh, SA  │  │                              │  │
│ │  ● …                                        │  │ Not recorded:                │  │
│ │                                             │  │ Rating · Renewal rate ·      │  │
│ │                                             │  │ Last trip                    │  │
│ │                                             │  └──────────────────────────────┘  │
│ │                                             │  ┌──────────────────────────────┐  │
│ │                                             │  │ Device                       │  │
│ │                                             │  └──────────────────────────────┘  │
│ └─────────────────────────────────────────────┘                                    │
│ │←──────── main, minmax(0,1fr) ────────→│ 16 │←──── side, 320px ────→│              │
│ ┌────────────────────────────────────────────────────────────────────────────────┐ │
│ │ Wallet and payments                                            2 movements     │ │  band
│ │ ┌────────────────────────────────────────────────────────────────────────────┐ │ │  FULL
│ │ │ Date │ Reference │ Description │ Debit │ Credit │ Balance                  │ │ │  WIDTH
│ │ │ Opening balance                                             0.00           │ │ │
│ │ │ 31 May │ WTX-4002-T1 │ Wallet top-up │    — │ 120.00 │ 120.00              │ │ │
│ │ │ 19 Jun │ WTX-4002-T2 │ Wallet top-up │    — │  80.00 │ 200.00              │ │ │
│ │ │ Closing balance                        —   │ 200.00 │  200.00              │ │ │
│ │ └────────────────────────────────────────────────────────────────────────────┘ │ │
│ └────────────────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────────────────┘
```

`DetailPage`, `grid-cols-detail` (`minmax(0,1fr) 320px`, 16px gutter) above `--ev-bp-wide`,
one column below it with the side cards restacked beneath main in order (**AC-34**).

**`DetailPage` gains one slot, `below?: ReactNode`**, for the ledger band. See §7.6 and §13.

### 7.2 The back affordance — owner amendment 1

**What it is.** §8 slot 1: a single `←` at the inline-start of the band's title row.
Never a trail (§2.6). Mirrors in Arabic, swapped at construction time via `mirrorGlyph`
(§9.5 — *"MUST swap directional text glyphs at string-construction time rather than with
CSS"*).

**What it says.** Icon-only, with **an accessible name and a tooltip that name the
destination**, not the action: `Back to riders`. §5.7 sanctions a tooltip for exactly this —
*naming an icon-only control* — and one destination token is not a breadcrumb trail.

**Where it goes.** Inside the band, at the inline-start of the name row, `text-hero-foreground`
on `bg-hero-2` as a ghost button. It is the first tab stop on the page.

**What it does when there is no history — the ruling.**

`navigate(-1)` is **refused outright.** It is not testable, it walks out of the app on a deep
link or a fresh tab, and `window.history.length` counts entries from other origins so it
cannot be probed. Instead:

1. If the navigation carried `location.state.from`, go there.
2. Otherwise go to the record's **index route**, from a total map:
   ```ts
   const INDEX_ROUTE: Readonly<Record<ProfileEntityType, { path: string; labelKey: string }>>
   // rider → { path: '/operations/people?view=riders', labelKey: 'profile.back.riders' }
   ```
   Total over the closed union: a twelfth entity type without a destination does not compile.
3. **There is no third case.** The arrow is never hidden and never disabled — §11.2 — because
   there is always a destination.

**Who sets `state.from`.** Two entry points, both required:
- the index row's identity link, and
- the sheet's `Open full profile`, which sets `from` to the route the sheet was open **over**.

That second one is the behaviour that matters: an operator who opened the rider from a ticket
lands back on the ticket, with the sheet re-opened (the `?entity=` param is still on that
route). That is AC-21 working, not a bug.

### 7.3 The band on the page

Same `ProfileBand`, with:
- the back arrow at the inline-start (§7.2),
- **no `✕`**,
- the action cluster at the inline-end — §7.4.

**`Churn risk: High` is not in the action cluster.** It is a status, not a control, and §8
slot 3 forbids a status inside the action cluster in any case. It moves to the strip's `Plan`
cell. §8.1.

### 7.4 Actions — where each one renders

**The placement rule: a command renders where its target is named, and at most once per
surface.**

| Command | Target | Renders on | Both surfaces? |
|---|---|---|---|
| ~~`rider.renewPlan`~~ | — | **nowhere.** No client operation exists (§13 C), so it is undeclared and therefore absent from both surfaces **together** | — |
| ~~`escrow.release`~~ | — | **nowhere. Ruled out of scope — §8.3** | — |
| `trip.assign` — `Assign a captain` | **one trip** | the open-trip card, in the **body**. Disabled on the sheet, navigating on the page — see below | yes |
| `profile.openFullPage` — `Open full profile` | navigation | sheet footer, inline-start, `variant="link"` | sheet only |

Consequences, each of which removes a duplicate the references drew:

- **`Assign a captain` leaves the page header.** Its target is `TRP-9104`, not the rider; a
  page about a rider whose primary action mutates a different record is a category error, and
  with two open trips the header button would be ambiguous while the card button never is.
  R3 also refuses it: two filled buttons on one surface.
- **`Release` leaves the sheet footer and does not land anywhere else.** §8.3.

**`Assign a captain` survives §6.2's restored "the layer commits nothing" clause**, and the
reasoning is worth stating because it looks like a collision and is not:

1. The clause **legislates the footer** — *"`Open full profile` as a plain link at
   inline-start; no primary"* — and the footer is now the link alone (§6.8).
2. **The control commits nothing anywhere.** There is no assign operation on the seam
   (§13 C), so on the sheet it is disabled in place with its reason and on the page it
   navigates to Live dispatch. Neither mutates.
3. **§11.2 forbids hiding it.** Removing it was never the alternative to showing it; the
   alternatives were *disabled with a reason* and *disabled without one*.
- **No record pager `‹ ›`.** §8 slot 5 permits one on *"record-detail pages in an ordered list
  only"*. `/entity/:id` is reached from search, from any table, from a notification and from
  the sheet; there is no list, so there is no pager.

**`Assign a captain` navigates.** There is no client operation that assigns a captain to a
`Trip` (`clients/trips.ts` ships `setTripFlag` and nothing else; `assignRequest` acts on a
`RideRequest`). Rather than ship a dead button or invent an operation, the control opens Live
dispatch focused on this trip: `/operations/dispatch?trip=TRP-9104`. The inherited precedent
is in the frame I opened — `Fulfill item` and `Create shipping label` on
the inherited capture both navigate to where the work is done.
Assignment needs a map and a captain list; a profile has neither.

**`Release` is gone. See §8.3 for the ruling and its reasoning.**

**Confirmation, for whatever commits.** A committing action inside the profile **modal**
cannot open a §5.3 confirmation dialog, because §5.5 forbids a modal nested inside a modal.
Ruled: **confirm in place, on both surfaces**, using §4.7's expand-in-place pattern that §6.4
already sanctions for the account layer. One mechanism, both surfaces, and everything §5.3
asks for survives — a question naming the object, a body saying what does *not* change, and a
primary restating the verb. **Nothing on either surface commits today**, so this is a standing
rule for the first thing that does rather than a description of a control that exists.

### 7.5 The side column

§7.2: the rail holds **only** status, summary and metadata. Two cards:

**`Identity`** — `FieldList layout="rows"`: `Phone`, `Status`, `Tier`, `City`, `Gender`,
`Joined`, `Address`. Then, in the same `<dl>`, the absent group.

**`Device`** — `Device`, `App language`, `Last IP`, `IP location`. Rendered whenever any of
them has a value; `RDR-4002` has all four.

**The `NOT RECORDED YET` group.** Ruled: use the shipped path and change nothing about it.
Pass `Rating`, `Renewal rate` and `Last trip` with `value: null`; `splitAbsent()` groups them
(its threshold is three, which is exactly this case) and `AbsentLine` renders:

> **Not recorded:** Rating · Renewal rate · Last trip

- **No em dashes.** §8.3.1 reserves `—` for not-applicable-or-unknown, and `states.md` is
  explicit that an em dash is *"a claim that the number exists somewhere"*. The heading
  carries §3.5's words once, for all three.
- **Sentence case** — `Not recorded:`, not `NOT RECORDED YET` (D18).
- The `·` separators are `aria-hidden`; a screen reader gets the labels as text.

**No `Fairness`, `Compliance` or `Commitment` card on a rider** — `SECTIONS.rider` does not
declare them. Nothing here branches on entity type; the data says so.

### 7.6 The movements table — owner amendment 2

`src/components/DataTable.tsx`, **`mode: 'ledger'`**, no exceptions.

**Why the mode, first.** `useIndexTable({ mode: 'ledger' })` returns `LedgerTable`, which has
no `sort`, no `setSortField`, no `selectedIds` and no `toggleRow` **at all**. So §8.3.3's
*"§3.1 row actions and §3.3 bulk selection MUST NOT appear on a ledger"* is enforced by `tsc`,
not by review. That answers the owner's third question before it is asked.

**Columns.** Reuse `ledgerColumns(t, language)` from
`src/screens/financials/shared/LedgerCard.tsx`. Do not declare a second set — a second
spelling of a column set is a second contract that has not noticed yet.

| # | id | header | `dataType` | align | width | notes |
|---|---|---|---|---|---|---|
| 1 | `date` | `Date` | `date` | start | 104 | carries the R5a marker slot |
| 2 | `reference` | `Reference` | `id` | start | 128 | `<bdi>`, `font-medium` |
| 3 | `description` | `Description` | `text` | start | `minWidth: 240`, `maxWidth: 640` | the one flexible column; the only cell that may wrap |
| 4 | `debit` | `Debit (SAR)` | `money` | **end** | 116 | positive; em dash on a credit row |
| 5 | `credit` | `Credit (SAR)` | `money` | **end** | 116 | positive; em dash on a debit row |
| 6 | `balance` | `Balance (SAR)` | `money` | **end** | 128 | `balanceAfterHalalas`, **never recomputed** |

- **Alignment (R4).** The three money columns are `text-end`, header and value sharing one
  edge, `tabular-nums`. **This does not flip in Arabic** (R4, §9.2).
- **The unit is in the header once and in no cell** (§8.3.1). `MoneyCell`'s default already
  does this.
- **Direction is the column, never a sign and never a colour.** No row carries a value in
  both (§8.3.3 / AC-302).

**The `Balance` row — the owner's question, answered.**

Not a table row you write. Not a footer. Not a node outside the table. It is
**`ledgerBoundaryRows`**, and there are **two** of them:

```tsx
ledgerBoundaryRows={{
  opening: { label: t('fin.ledger.opening'), value: <MoneyCell amount={ledger.openingBalanceHalalas} /> },
  closing: { label: t('fin.ledger.closing'),
             note:  t('fin.ledger.boundaryNote', { debits, credits }),
             value: <MoneyCell amount={ledger.closingBalanceHalalas} /> },
  alignTo: 'balance',
}}
```

- §8.3.3's MUST: *"A ledger MUST open with a labelled opening-balance row and close with a
  labelled closing-balance row, both bold on both sides."* The reference draws one row; the
  rule requires two. **Ruled for `DESIGN.md`** — and `ledgerBoundaryRows` types both as
  required, so one is not expressible anyway.
- `alignTo: 'balance'` puts the figure **under the column it totals**. This is not a
  preference: the full-span alternative measured **1,828px between `Opening balance` and its
  `0.00`** on `/financials/wallets` at 2400px. The column header is the label; the figures
  above are the addends.
- **The closing balance and the strip's `200.00 SAR in wallet` are one field.** §8.3.3: *"the
  closing balance MUST equal the balance displayed in the card header."* A mismatch is a test
  failure, not a rounding question.
- `DataTable` renders both rows. The screen renders none.

**Selection, row actions — neither.** Compile-enforced (above). The only per-row control
permitted by §8.3.3 is a read-only link to the source document, which `sourceLinkFor` already
gates to trips (`LINKABLE_SOURCES`) so no row links to a route that 404s.

**Everything else, concretely.**

| Prop | Value |
|---|---|
| `status` | forwarded from `useAsync`; the table owns all four states |
| `emptyKind` | irrelevant — `LedgerCard` overrides it. Pass `hasHistory` from **`Ledger.lifetimePostings`**, never `totalPostings` |
| `firstRun` | §7.7 |
| `noMatch` | §7.7 |
| `error` | §7.7 |
| `rowMedia` | `false` (default) — no avatars in a ledger |
| `isRowCritical` | `(p) => p.settlement === 'failed' \|\| p.settlement === 'escalated'` — **declared**, never duck-typed |
| `skeletonPattern` | `'P7'` (defaults from the mode) |
| `infiniteScroll` | `false` — a profile shows a bounded window and states its truncation in words |
| `tableId` | `'profile.wallet'` |

**Where it sits, and why not in the main column.** §8.3.3 fixes the column set at six and
`DataTable` refuses to hide a ledger column (`showVisibility={!isLedger}`). §7.3's budget for
that set is **832px** (870px is the Arabic ceiling at 1280). The detail page's main column
measures ~912px at 1280 (single column, side cards restacked) and **~696px at 1440** (two
columns) — so the table would *fit at 1280 and overflow at 1440*. A table that gets worse as
the screen gets wider is not something an operator can read as intentional.

**Ruled: the ledger is a full-width band beneath the two-column body.** `DetailPage` gains
`below?: ReactNode`. See §13 A for the handoff, including the fallback if that change is
refused.

Above the table, on the same band: the section heading `Wallet and payments` at the
inline-start and `{count} movements` at the inline-end — **`2 movements` for `RDR-4002`**,
from `Ledger.totalPostings` — both capped to `tableCeiling(columns)` so the summary ends where
the table ends.

**The reference's `four movements · 98.00 SAR still held` does not survive, and the reason is
not just the count.**

`getRiderMoneyMovements` returns **four** movements for this rider — two wallet top-ups and
two card payments — so "four" is a real number. But it is the count of a **unified money
story across two ledgers**, and this band is a §8.3.3 **ledger** with a running balance. The
two payments have `inWalletBalance: false` and `balanceAfterHalalas: null`: they never touched
the wallet. Putting them in this table would mean:

- half the Balance column rendering `—`, which §8.3.3 permits for a *pending posting on this
  ledger*, not for a record from another one; and
- a boundary row that **cannot reconcile**. AC-319 computes the column totals from the
  rendered rows, so the closing row would read credits 200.00, debits 162.00 and a closing
  balance of 200.00 — three numbers that do not add up, under a header whose whole promise is
  that they do.

A ledger whose columns do not sum to its balance is worse than two lists. **So the band is the
wallet ledger — 2 postings, reconciling — and the two payments render in the page's payments
section**, which `PAGE_PLACEMENT` already sends to `main`. Both surfaces carry all four
movements; the sheet unifies them, the page splits them by ledger.

**This is the fact-rank amendment (§3.2) earning its keep a second time.** The running balance
is `detail`-rank and page-only, exactly as §8.3.3 requires; the four movements are
`summary`-rank and appear on both. The sheet can unify them precisely *because* it omits the
balance column, so the reconciliation problem it would create does not arise there.

And it is the same error as §6.3.1 with the sign flipped: the reference summed two ledgers in
the caption here, and subtracted across two ledgers in the wallet block there.

### 7.7 The `History` timeline

§3.8.

```
History

22 Jun
  ●  Account registered                                       09:14 · Riyadh, SA
```

- Date heading, then one row per event: a dot at the **inline-start**, the event sentence,
  and the time + place at the **inline-end**.
- **No connecting rule between dots.** The reference frame has none, and a rule through a
  restacking column is a maintenance liability for no reading.
- **The composer is not here.** §3.8 puts a composer above a feed, but a movement log is a
  system record with nothing to compose against. There is no composer on this screen.
- Empty: one grey sentence, `Nothing is recorded here yet.` — the third `states.md` kind,
  because a rider with no movement log has nothing captured rather than nothing matching.

---

## 8. The remaining rulings

### 8.1 `Churn risk: High` — status or control?

**A status. And not a badge either.**

- **Not a control.** It is drawn as a dark red button in the page header's action cluster.
  §8 slot 3 is explicit: inline status badges sit *"immediately after the title on the same
  baseline. Never on their own row, **never inside the action cluster**."* §12.1 adds that a
  badge is never interactive — `StatusBadge` has no `onClick`, no `href` and no focus ring,
  by type.
- **Not red.** R5a enumerates red's four permitted uses and a risk chip is not among them.
  R7's five tones are closed and none of them is critical.
- **Not a badge at all**, which is the part that is a genuine ruling rather than a lookup.
  Churn risk is a **prediction**, and §3.4's badge family communicates **status**. A
  prediction wearing status chrome claims a certainty the value does not have. The inherited baseline makes
  the same call in the frame I opened: the inherited capture renders
  *Fraud analysis* as a labelled **level on a scale** — `Low · Medium · High` — with a
  recommendation sentence, and never as a badge.
- **So it renders as a fact:** label `Churn risk`, value `High` in ink, no fill, no border,
  not focusable. `rail.tsx`'s `flagsOf()` already renders exactly this fact as a word.
- **Its reason line is mandatory, not decoration.** §8.2 governs derived values, and
  `Rider.churnRisk` is computed. `Lapsed with nothing used` is the derivation, and a computed
  level with no stated basis is the legacy defect §8.2 exists to close.
- Where the reference gives it a block of its own, it keeps the block. **The prominence comes
  from position and size, not from hue.**

`CHURN_RISK` in `people/domain.ts` maps `high → warning` for the People index's badge. The
profile deliberately does not badge it: the record's one badge slot is `Rider.status`, and two
badges side by side make neither read.

### 8.2 The two standings that contradict

The band's meta row says `On demand`; the strip's third cell says `Expired`. Both are true and
they look like a contradiction.

**Ruled: label the third cell `Plan`.** Not `Last plan` — that is wrong the moment the plan is
active, and a label may not change with its value. `On demand` (how the rider buys rides) and
`Plan · Expired` (what happened to their last cycle) then visibly answer different questions.

**And there is a data defect underneath, which the label must not paper over.**
`types/rider.ts` documents `Rider.status` as derived from `subs.length`, so `on-demand`
*means* "no subscription rows" — while the reference shows `SUB-2003`. `RDR-4002`'s fixture
has `subscriptionIds: []`. Those cannot both be true. **Ruling for the data agent:**
`Rider.status` derives from **active** subscriptions only, and `status: 'on-demand'` with a
non-empty `subscriptionIds` is a fixture invariant violation, asserted in a test.

Where a rider has no subscription at all: the cell keeps its label and reads
`No plan on this record` at body size. **Never an em dash** — that would claim a plan exists
somewhere.

### 8.3 Releasing a fraud-review hold is out of scope for this surface

**Ruled: neither profile surface offers any control that releases, clears, approves or
reverses a payment hold. The hold is displayed and linked; the decision is not taken here.**

An earlier draft of this spec wired `Release` to `releaseEscrow` and specified a §11.2
disabled state reading `0 of 5 trips delivered`. **That was wrong, and wrong in the exact way
§11.2 exists to prevent** — a disabled control with a confidently incorrect reason is worse
than no control at all. Recording the error, because the reasoning that produced it is a trap
anyone reading the fixtures quickly will fall into:

| | |
|---|---|
| `releaseEscrow` operates on | **`EscrowHold`** — needs `subscriptionId`, `captainId`, `tripsRequired`, `tripsCompleted`. It releases *subscription escrow to a captain* after N delivered trips |
| The rider's 98.00 is | **`PAY-6150`, a `Payment`** — `subscriptionId: null`, `tripId: null`, frozen for **fraud review** |
| Escrow holds for this rider | **none.** `tripsRequired` appears in one fixture file and no row references `RDR-4002` |
| The refusal it would have shown | `0 of 5 trips delivered` — a sentence about a *captain's trip delivery*, offered as the reason a *rider's fraud hold* cannot be lifted |

So the control would have acted on a record that does not exist and explained itself with a
fact about a different one. Two different things wear the word "held"; only one of them is on
this record.

**And there is no operation either way.** Every `release*` export across the clients was
checked — applicants, assurance, cash, complaints, conversations, escrow, fairness, requests,
safety. **Nothing releases a payment or a wallet hold.** `clients/payments.ts` exports four
functions and all four are reads: `listPayments`, `getPayment`, `listPaymentsForEntity`,
`getPaymentFacets`. A read-only client is a decision somebody made, not an omission.

**Why it is ruled out of scope rather than parked as a missing operation.** The distinction
matters, because "absent until the operation lands" invites someone to build the operation
and wire it straight into this screen, and that is the outcome to prevent:

1. **The hold's basis is not on this screen, and it is not even about one rider.** The fixture
   is explicit: the hold exists because `RDR-4002` **and another rider** share `160.156.4.90`.
   It is the output of a correlation across at least two records. Reversing it from one of
   those two profiles means acting on a two-record finding from a one-record surface, where
   the operator cannot see the other half of what they are overturning.
2. **A fraud hold is a decision, and a decision is reversed where its case lives.** A profile
   is a *read* of a record. Reversing a fraud decision needs the evidence, the assessor, a
   reason code and an audit entry — `releaseEscrow` writes an audit entry and a two-leg
   journal entry for exactly this reason. The rider profile has nowhere to collect a reason
   code and no case to attach one to.
3. **§8.2's doctrine, applied to a decision rather than a number.** A derived value must state
   its derivation. A derived *decision* offered for reversal must show its basis, or the
   operator is guessing. This screen cannot show it.

**What the profile does instead:** it shows the hold prominently (§6.3.1) — a rider with money
under review is much of the reason to open their profile — names the payment and the date, and
**links to the payment**. Surfacing is not the same as deciding.

**Consequence for the contract (§3.4d).** `payment.release` is not declared in
`RIDER_COMMANDS`, so it is absent from both surfaces together and neither can grow it
unilaterally. If the operation is later built for the fraud surface that owns the case, this
ruling still holds: the command's scope is that surface, not this one.

**Raised for product-owner** in §13 C — if the owner wants operators releasing fraud holds at
all, the question is *which surface owns the fraud case*, and that is a scope decision, not a
design one.

---

## 9. States — all four, both surfaces

§11.2 applies throughout: **a blocked control is disabled in place with a stated reason, never
hidden.**

### 9.1 The sheet

| State | Rendering |
|---|---|
| **Loading** | The band renders **in full** with the title from `ProfileRef` — it resolved before the record read started. Rail: four `SummaryBlock` skeletons (label bar + figure bar + caption bar). Tabs render with **no counts**. Detail column: `LoadingSkeleton pattern="overlay"`. Never a spinner (§11.3). Footer renders with every action **disabled**, reason `Loading this record.` |
| **Error** (record read failed) | Band renders with `ProfileRef`'s title and subtitle. Rail and detail column each carry `ErrorState scope="card"` — `Couldn't load this rider. Try again.` with a `Try again` action. **The sheet stays dismissible** (§9.2 #14). Each *section* keeps its own error independently: a failed wallet read fails the Money tab and nothing else. |
| **Not found** (`ApiError.kind === 'not-found'`) | **Not an error.** `EmptyState kind="no-match"`, naming the id searched: `No record matches RDR-9999.` (`state.overlayNotFound.message`). No band, no rail, no tabs. Layer still dismissible (AC-42). |
| **Empty** | There is no whole-sheet empty: a resolved rider is a record. Per-section empties are one grey sentence each — §9.3. |
| **Content** | §6. |

### 9.2 The page

| State | Rendering |
|---|---|
| **Loading** | Band renders in full — title from the route, actions **disabled in place with `Loading this record.`** A header that appears after the data is a layout shift on every navigation. Strip: three skeleton cells. Main: `LoadingSkeleton pattern="P2"`. Side: empty (a rail of skeletons beside a record that may not resolve claims something is arriving). Ledger band: `DataTable status="loading"`, pattern `P7`. |
| **Error** | Band in full. Main: `ErrorState scope="card"` with `Try again`. Side: empty. Ledger band: `DataTable status="error"` with its own retry — one card failing leaves the rest working. |
| **Not found** | `EmptyState kind="no-match"` in main, empty side, **the back arrow still works** — it is the one control that must survive a 404. |
| **Empty** | Per-section. The ledger is the only whole-band empty: see below. |
| **Content** | §7. |

### 9.3 Every empty, with its exact copy and its kind

`states.md` has three kinds and conflating any two is the V-2 defect.

| Where | Kind | Copy |
|---|---|---|
| Open-trip card, no open trip | card | `No trip is open right now.` |
| History / movement log, no entries | card | `Nothing is recorded here yet.` |
| Ledger, **no postings ever** (`lifetimePostings === 0`) | **first-run**, whole band, **no illustration** | heading `No money has moved through this wallet` · body `A top-up, a refund to the wallet or a goodwill credit opens it. Nothing has yet.` · action `Back to wallets` |
| Ledger, has history, window quiet, **nothing narrowing** | `no-match`, **no action** | `No postings between {start} and {end}.` |
| Ledger, a search or filter narrowed it to zero | `no-match` | `No postings match these filters.` + `Clear all filters` (supplied by `DataTable`) |
| Payments, none | card | `Nothing is recorded here yet.` |
| Tickets, none | card | `No tickets reference this rider.` |
| Identity absent fields | not an empty | the `Not recorded:` group, §7.5 |
| Trips list, none | card | `Nothing is recorded here yet.` |

**No illustration anywhere except the ledger's first-run band** (R8). That one is a
whole-band, zero-records-ever state and it is the only one that qualifies on this screen.

### 9.4 Domain states — the ones that carry the real defects

| Domain state | Rendering |
|---|---|
| **A payment under review** (`settlement` is `held`/`authorised`/`pending`/`reconciling`) | The under-review group renders (§6.3.1) with the summed amount, the payment id and the hold date, linking to the payment's row. Its row badge is `Held`, tone `warning`. **No release control** (§8.3). |
| **Two or more payments under review** | The group sums them and the caption names the count instead of one id: `2 payments · oldest 23 Jun`. It still links to the Money tab, filtered. |
| **A previously held payment, now released** (`PAY-6151`) | An ordinary payment row, badge `Released`, tone `neutral` (§8.3.4). It leaves the under-review group, which is a sum over currently-pending settlements only. `RDR-4002` carries both states deliberately, so the before and after sit in one list. |
| **No payment under review** | The under-review group and its rule **do not render at all.** There is no zero state here: `Payments under review · 0.00 SAR` would invent a category the record is not in. This is the tile rule (R4-11 §11.2) applied to a group. |
| **Wallet overdrawn** (`walletBalanceHalalas < 0`) | `−45.00` with **U+2212**, in ordinary ink. Never red, never parentheses, never a badge (§8.3.2). The caption gains `Balance is below zero`. |
| **Posting pending / held** | Excluded from the balance; `—` in the balance column; a separate labelled `Pending` line beneath the wallet figure (§8.3.4, AC-312). |
| **Posting failed / escalated** | `RowCriticalMarker` on the leading edge (R5a use #3) **plus the word in the description** — colour is never the only carrier. Never a badge. |
| **Trip open with no captain** | The card's second row, as drawn. |
| **Trip late** | Status word `Late`, `StatusBadge tone="warning"` (`TRIP_STATUS.late`). Not red. |
| **Rider has no plan ever** | Strip `Plan` cell: `No plan on this record`. No meter. |
| **Plan allowance ≠ 5** | §6.6. |
| **Operator lacks `view_profiles`** | The layer does not open and the route refuses (AC-60). This is a permission on the whole record, so it is the one thing that *is* absent rather than disabled — §11.2 governs controls, not records. |
| **Wallet with no postings ever** (`lifetimePostings === 0`) | The ledger band renders the first-run empty (§9.3). The strip's wallet figure still reads `0.00 SAR`, which is a measured zero and not an absence. |

---

## 10. Arabic — §9

The record is Arabic inside an English UI **and** the whole surface must survive `dir="rtl"`.
Those are two different problems and both are here.

### 10.1 Arabic content in an English page

| Value | Treatment |
|---|---|
| `Rider.name` — `الجوهرة بنت عبد العزيز…` | `<bdi>` around the name in the band. A 46-character Arabic name in a 30px LTR line is the case that reorders. |
| `Rider.address` — `حي حطين، طريق الملك سلمان، الرياض` | `<bdi>` in the `Identity` card's value slot. `FieldList` already wraps every value in one. |
| Trip route — `حي حطين` → `مستشفى الملك فيصل التخصصي` | Two `<bdi>` nodes with the arrow between them as a separate element. §10.2. |
| `Rider.phone` — `+966 59 448 7070` | `<bdi>`. The leading `+` is bidi-neutral and jumps sides without one — `rail.tsx` records this measured, as `0101 001 53 966+`. |
| `RDR-4002`, `TRP-9104`, `WTX-0002` | `<bdi>`. In the table, `dataType: 'id'` deliberately does **not** auto-isolate (it is the identity cell, a composite), so `ledgerColumns` wraps them by hand — it already does. |
| Money `200.00 SAR` | `<bdi>` via `Money`. Isolation is the component's job, never the string's — no U+2068 in the data, or copy-paste and test assertions break. |

### 10.2 The `→` in the route — it mirrors, and the glyph is not the whole problem

§9.5's first table: *"Forward / next arrow — LTR `→`, RTL `←`"* — **MUST mirror**. And the
rule below it: *"MUST swap directional text glyphs at string-construction time rather than
with CSS."* So `mirrorGlyph('→', dir)`, never `scaleX(-1)`.

**But swapping the glyph is not sufficient**, and this is the trap. If the route is one text
node — `origin + ' → ' + destination` — the bidi algorithm resolves the neutral spaces and the
arrow against the paragraph and walks the three pieces apart.

**`Trip.route` is exactly that string, pre-joined, and it may not be rendered here.** The
fixture stores `route: 'حي حطين → مستشفى الملك فيصل التخصصي'` **and** `pickup` and
`destination` as separate fields. `route` carries a hardcoded `→` that no `mirrorGlyph` call
can reach, cannot isolate its two halves, and cannot be translated. Use the two fields. Build
it as three siblings in a flex row:

```tsx
<span className="flex min-w-0 items-baseline gap-2">
  <bdi className="truncate">{trip.pickup}</bdi>
  <span aria-hidden="true" className="shrink-0">{mirrorGlyph('→', dir)}</span>
  <bdi className="truncate">{trip.destination}</bdi>
</span>
```

DOM order is logical order; the flex row reverses with the document; each endpoint isolates
itself. The accessible name is a **keyed string with two named params** —
`profile.trip.route` = `{origin} to {destination}` / `من {origin} إلى {destination}` — never
built by concatenation (§9.6).

### 10.3 The dark band

- Mirrors as a block: eyebrow, name and meta row at the inline-**start**; `✕` (sheet) or the
  action cluster (page) at the inline-**end**. The back arrow leads the name row in both
  directions and its glyph swaps.
- Meta dividers are `border-inline-start`, so they land between items in reading order with no
  second rule. **A `border-r` here is a defect on arrival.**
- The eyebrow's `·` is a separate `aria-hidden` element between two `<bdi>` spans, so the
  visual order becomes `RDR-4002 · راكب` in Arabic — which is the logical string read
  right-to-left, and correct.
- `uppercase` and `tracking-wider` are both no-ops in Arabic by design (`globals.css` zeroes
  the tracking scale under `:root:lang(ar)`); the eyebrow keeps its size, weight and colour,
  which is what carries it.
- **The band does not invert in dark mode.** `--ev-hero` is documented as *"the one surface
  that does not invert"* — a light field filling the top of a dark console at 3am is the glare
  source the token exists to refuse.

### 10.4 The meter

**Mirrors.** §9.5's first table: *"Progress bars and step trackers — LTR fills L→R, RTL fills
R→L."* Implementation: a flex row of `flex-1` segments with the filled ones **first in DOM
order**. The row reverses with the document and nothing else is needed.

**Forbidden:** any `left`, `translateX`, `background-position` or `width`-from-the-left
construction. Those do not reverse, and a meter that fills from the wrong edge in Arabic is
the same class of defect as the toast that slides in away from its own anchor (`:5288`).

### 10.5 The timeline dots

**Mirror.** They are chrome (`rtl.md`: *"Layout, chrome, nav, toolbars — Yes"*). The dot takes
the **inline-start** of its row and the timestamp the **inline-end**. `ms-`/`me-`, never
`ml-`/`mr-`. There is no connecting rule to mirror (§7.7).

### 10.6 What does **not** mirror on this screen

| Thing | Why |
|---|---|
| The three money columns' `text-end` alignment | R4, restated by §9.2 — *"in Arabic this alignment does not flip"* |
| Every numeral run: `200.00`, `0 of 5`, `+966 59 448 7070`, `25 Jun 09:11` | The UBA lays digits LTR inside an RTL line. Isolated, not reordered |
| `SAR` as a trailing unit | §8.3.1; the isolation keeps it trailing |
| Western digits `0–9` | Saudi digital convention (§9.2), never Arabic-Indic |
| `✕`, `·`, `●`, `▾` | Symmetric marks (§9.5's second table) |
| `↗` | Would not mirror — which is moot, because §6.8 removes it |

### 10.7 Copy in Arabic

- Sentence case does not exist in Arabic; §5.7 rule 1 simply does not apply (§9.6).
- Arabic comma `،` and question mark `؟` throughout.
- **No string on this screen is built by concatenation.** Every one is a key with named
  params. This includes the four `flagsOf()` strings in `rail.tsx` that currently are — see
  §13 G.

---

## 11. Deviations and refusals

Each names the rule it suspends, or it is not a deviation — it is an error.

### 11.1 Deviations — things this design does that a rule forbids

| # | Deviation | Suspends | Why |
|---|---|---|---|
| **D-RP-1** | The body is **a rail plus tabbed sections** (sheet) and **a strip plus a two-column body plus a ledger band** (page), not a stack of collapsible cards | `00-shell.md` **§6.2**, *"a stack of collapsible cards"* | What §6.2 protects is the **contract** — *"contributed by workspaces as a declared contract… not one 600-line builder"* — and the contract is `ProfileRef.sections`, which is untouched. The stack was a *geometry*, and both of the owner's references replace it. §3.4's total placement maps preserve the guarantee that mattered: every declared section lands somewhere, and no surface can drop one. A collapsed card and a closed tab hide the same amount of content; both name what is inside. |
| **D-RP-2** | `--ev-bg2` gains a **seventh job: the record-summary band** (the sheet's rail, the page's strip) | §6.2 **D-11**'s derived list of six jobs for the one subdued fill | The fill does work a border cannot: it says *this is a readout of what is below, not another card of content*. The inherited baseline solves the same band with a border because its canvas is grey and its cards white — an inversion **D7 removed**, so the borrowed treatment does not transfer. **No new colour and no new token**, which is what the "no new colour" rule exists to protect. |
| ~~**D-RP-3**~~ | ~~The sheet's footer carries committing actions~~ | — | **LAPSED — the premise was withdrawn.** It suspended §6.2's *"the layer commits nothing"* on the ground that the layer was a **modal**, and therefore no longer a thing consulted beside the work. The owner reversed that instruction; the layer is a drawer again (§6.1), so the clause is back in force **and the design already complies** — the footer is `Open full profile` alone. A deviation whose premise is gone is not narrowed, it is void. Kept rather than deleted so the numbering and the reasoning survive. |
| **D-RP-4** | A committing action inside the sheet **confirms in place** rather than in a modal | §5.0, *"Destructive / irreversible → Modal"* | **Its basis changed with the drawer and it got stronger.** It used to rest on "no modal inside a modal", which was an inference; it now rests on §5.5's explicit clause — *"a modal nested inside a drawer is FORBIDDEN"* — which is back in force and is a rule rather than a reading. §4.7's expand-in-place pattern is already sanctioned for exactly this in §6.4. Everything §5.3 requires survives: a question naming the object, a body saying what does not change, a primary restating the verb. **Nothing on either surface commits today**, so this is a standing rule for the first thing that does. |
| **D-RP-5** | `DetailPage` gains a **`below`** full-width slot | §7.2's two-slot shape | §8.3.3 fixes the ledger at six columns and forbids hiding any; §7.3's budget for that set is 832px; §7.2's main column is ~696px at 1440. A table that fits at 1280 and overflows at 1440 cannot be read as intentional. See §13 A. |

### 11.2 Refusals — things the references draw that this design does not build

Each is a place the reference contradicts `DESIGN.md`, with the rule I ruled for.

| # | The reference draws | Ruled | Rule |
|---|---|---|---|
| **X-1** | `Expired` large in **red** | Neutral ink at figure rank | **R5a** — four permitted red uses; a status word is not one. A fifth needs a §6.2 row this spec may not write |
| **X-2** | A **pale red** `CHURN RISK` card | An ordinary summary block | **R5a**, **R1/R16** — the four banner tones are pale tinted cards and this is not a banner; there is no critical card |
| **X-3** | `Churn risk: High` as a **dark red button** in the header | A fact in the strip's `Plan` cell | **§8 slot 3** (never inside the action cluster), **§12.1** (a badge is never interactive), **R5a**, **R7** |
| **X-4** | **Uppercase letter-spaced labels** off the band — `WALLET`, `SUBSCRIPTION`, `TRIPS COMPLETED`, `CHURN RISK`, `EARLIER`, `MONEY`, `ENGAGEMENT`, `STANDING`, `IDENTITY`, `NOT RECORDED YET`, `OPEN RIGHT NOW`, `LIVE · REQUESTED` | Sentence case, `text-xs text-muted-foreground` | **§6.3 D18** — uppercase + letter-spacing is banned for labels. The **band eyebrow keeps it**: it is a different instrument with its own precedent, and Arabic already neutralises both properties |
| **X-5** | A **signed amount** in the sheet's movement rows | Positive amount + the word `Debit` / `Credit` | §8.3.3 *permits* a signed column in a rail card; it does not require one. The page carries direction as a **column**, and two vocabularies for one fact across two surfaces is what §3 forbids |
| **X-6** | `Open full profile ↗` | `Open full profile` | **§9.5** classifies `↗` as the external-link mark; this navigates in place |
| **X-7** | A **composed absence sentence** (`No tickets, no device, no rating on this record.`) | Deleted; the `Not recorded:` group does the job | **§9.6** — never build a string by concatenation. Also **false** for `RDR-4002`, whose fixture carries a device |
| **X-8** | `NOT RECORDED YET` with `—` in each value | `Not recorded:` + the three labels, no dashes | **§8.3.1** reserves `—` for not-applicable; `states.md` — an em dash claims the number exists somewhere |
| **X-9** | One `Balance` row | **Two** boundary rows, `Opening balance` and `Closing balance` | **§8.3.3**, AC-49 / AC-317 / AC-318. `ledgerBoundaryRows` types both as required |
| **X-10** | A **five-segment** meter | `tripsIncluded` segments, capped at 12 | Not a rule collision — the drawing is right for a five-trip plan and silently wrong for any other. §6.6 |
| **X-11** | `Assign a captain` in the **page header** *and* `Assign` on the trip card | The card only | **R3** — one filled button per surface. And its target is the trip, not the rider |
| **X-12** | `Release 98.00` in the sheet footer | **No release control anywhere.** The hold is shown and linked; the decision is not taken here | §8.3 — the hold is a fraud-review hold on a `Payment`, its basis spans two riders, no operation exists, and the payments client is read-only by decision |
| **X-15** | `98.00 SAR HELD` **inside** the `Wallet` block, under `200.00` | A separate labelled group below a rule, `Payments under review` | **§8.3.4** — a pending amount is never part of a balance. The 98.00 is on a different ledger; the wallet is fully available. §6.3.1 |
| **X-16** | `four movements · 98.00 SAR still held` on the page's ledger band | `2 movements` | Two ledgers, one band. See below — this one has a second, sharper reason than the count |
| **X-17** | The trip route as one string | Built from `pickup` and `destination` | **§9.5 / §9.6** — `Trip.route`'s baked-in `→` cannot mirror, isolate or translate |
| **X-13** | Two eyebrows for one fact — `LIVE · REQUESTED 09:11` and `OPEN RIGHT NOW` | `Open right now`, both surfaces | **§3** — the parity contract |
| **X-14** | A pulsing `●` | A static dot | **R18** — the ambient-loop licence is for *"this feed is live"*; a record card is not a feed. Legacy defect **D24** is what misapplying it looks like |

---

## 12. Copy — every string, final

Sentence case. Buttons are verbs. No exclamation marks. Full sentences take a period;
fragments, labels and buttons do not (**R6**). Errors are imperatives naming the fix, with no
"please", "invalid", "failed" or blame.

### 12.1 Labels and headings

| Key | English |
|---|---|
| `profile.band.eyebrow` | `{kind} · {id}` |
| `profile.meta.tier` | `{tier} tier` |
| `profile.meta.joined` | `Joined {date}` |
| `profile.block.wallet` | `Wallet` |
| `profile.block.plan` | `Plan` |
| `profile.block.trips` | `Trips completed` |
| `profile.block.churn` | `Churn risk` |
| `profile.strip.money` | `Money` |
| `profile.strip.engagement` | `Engagement` |
| `profile.tab.activity` | `Activity` |
| `profile.tab.money` | `Money` |
| `profile.tab.identity` | `Identity` |
| `profile.heading.openNow` | `Open right now` |
| `profile.heading.earlier` | `Earlier` |
| `profile.heading.history` | `History` |
| `profile.heading.wallet` | `Wallet and payments` |
| `profile.card.identity` | `Identity` |
| `profile.card.device` | `Device` |

### 12.2 Values and captions

| Key | English |
|---|---|
| `profile.wallet.inWallet` | `in wallet` |
| `profile.wallet.lifetime` | `Lifetime value {amount}` |
| `profile.wallet.belowZero` | `Balance is below zero` |
| `profile.payments.underReview` | `Payments under review` |
| `profile.payments.heldSince` | `{id} · held {date}` |
| `profile.payments.heldSinceMany` | `{count} payments · oldest {date}` |
| `profile.plan.tripsUsed` | `{used} of {included} trips used` |
| `profile.plan.cycle` | `{plan} · {start}–{end}` |
| `profile.plan.endsOn` | `ends {date}` |
| `profile.plan.noAllowance` | `No trip allowance on this plan` |
| `profile.plan.unlimited` | `Unlimited trips` |
| `profile.plan.none` | `No plan on this record` |
| `profile.trips.completed` | `trips completed` |
| `profile.trips.since` | `Since {date}` |
| `profile.trips.quickRides` | `{count} quick rides · last trip {date}` |
| `profile.trips.noLastTrip` | `{count} quick rides · last trip not recorded` |
| `profile.churn.reason.lapsed` | `Lapsed with nothing used` |
| `profile.trip.route` | `{origin} to {destination}` |
| `profile.trip.meta` | `{id} · {date} · {status}` |
| `profile.trip.noCaptain` | `No captain assigned yet` |
| `profile.trip.moreOpen` | `{count} more open` |
| `profile.wallet.summary` | `{count} movements` |
| `profile.field.absentMany` | `Not recorded:` *(shipped)* |
| `profile.ledger.truncated` | `Showing {shown} of {total} postings` *(shipped)* |

### 12.3 Actions

| Key | English | Variant |
|---|---|---|
| `profile.action.assign` | `Assign a captain` | `default` — the one filled button |
| ~~`profile.action.renew`~~ | ~~`Renew plan`~~ | **not shipped — no operation (§13 C)** |
| `shell.layer.openFullProfile` | `Open full profile` | `link` |
| `profile.back.riders` | `Back to riders` | `aria-label` + tooltip on the `←` |
| `shell.layer.close` | `Close` | `aria-label` on the `✕` |

### 12.4 Refusals — §11.2's sentences, in full

| Key | English |
|---|---|
| `profile.rider.refusal.assign` | `Captains are assigned on the dispatch board.` |
| `profile.rider.refusal.assignAssigned` | `A captain is already on this trip.` |
| `profile.refuse.renewNoPlan` | `This rider has no plan to renew.` |

**Copy correction to what shipped.** `profile.rider.refusal.assign` currently reads
*"A captain is assigned on the dispatch board. **This layer commits nothing.**"* The second
sentence is this spec's internal rationale leaking onto an operator's screen: it names a
design rule instead of a next step, and no operator knows or cares what a layer commits.
§5.7 wants the fix, not the reason we cannot do it here. **One sentence, naming where the
work happens.** The first sentence is also re-tensed — *"a captain **is** assigned"* reads as
a statement that one already has been, which is the opposite of what the card says one line
above.

**State beats capability.** Where a trip already has a captain, `assignAssigned` renders
instead: that is the reason the operator can act on, and naming the captain is more useful
than naming the board.
| `profile.refuse.loading` | `Loading this record.` |
| `profile.refuse.permission` | *(from `roleRefusal`, never worded here)* |

### 12.5 Confirmation

| Key | English |
|---|---|
**There is nothing to confirm on either surface today.** Both writes the references drew are
out of scope — `Release` by ruling (§8.3), `Renew plan` for want of an operation (§13 C) — and
a command absent from `RIDER_COMMANDS` is absent from both surfaces together.

The shape below is the **standing pattern for the first control that does commit**, kept so
nobody invents a second one. It renders **in place** (D-RP-4), never as a nested dialog,
because §5.5 forbids a modal inside a drawer:

| Slot | Rule |
|---|---|
| Question | names the object and, where money moves, the amount |
| Body | says what does **not** change — §5.3's requirement, and the half most often dropped |
| Primary | restates the verb and the object. Never `OK`, never `Confirm` |
| Secondary | `Cancel` |

Exact strings are written when the operation exists and its semantics are known. **Writing
them now would be inventing the behaviour** — whether a renewal charges the wallet, starts
today or at the old cycle's end, and whether it can be undone are all unanswered.

### 12.6 Toasts — R9: one line, names the object exactly, ≤ 60 characters, no period

| Event | Toast | Chars |
|---|---|---|
| — | — | — |

**No toast fires from either surface, because neither surface mutates anything.** That is not
an omission: R9 spends a toast on a mutation of an object, and the two writes the references
drew are out of scope (§8.3, §13 C). Navigating away — `Open full profile`, or `Assign a
captain` on the page — is not a mutation and gets no toast.

When the first mutation lands: one line, naming the object exactly, ≤ 60 characters, no
period, no emoji, no action link. `Plan renewed for RDR-4002` is the shape. If the object name
grows, **truncate the object, never the verb**.

### 12.7 Errors

| Where | Copy |
|---|---|
| Record read failed | `Couldn't load this rider. Try again.` |
| A section read failed | `Couldn't load {section}. Try again.` *(shipped: `profile.state.error`)* |
| Ledger read failed | `Couldn't load movements. Try again.` |
| Not found | `No record matches {id}.` *(shipped)* |
| Renew conflict (409 after the gate) | `This plan changed while you were reading it. Reload the record.` |

---

## 13. Interaction and keyboard

**Tab order, sheet:** heading (focus lands here on open) → `✕` → the summary's one control
(the under-review link) → tab list → active panel → footer link. **Focus is NOT trapped** — the
drawer carries no scrim, and *the scrim decides the trap* (§7.3.3). Tab leaves the panel and
continues into the page behind it, which stays interactive (AC-20). `Escape` closes and
returns focus to the opener (AC-66).

**Tab order, page:** back arrow → band actions → the under-review link → main → side →
ledger band. No trap. The ledger's roving focus is `DataTable`'s.

| Key | Effect |
|---|---|
| `Escape` | Sheet: closes, restores focus to the opener (AC-66). Page: nothing |
| `←` / `→` | On the tab list only, moves between tabs. **Direction-aware**: in RTL, `←` moves to the *next* tab |
| `Home` / `End` | First / last tab |
| `Enter` / `Space` | Activates the focused control |
| Browser `Back` | Sheet: closes the layer, stays on the underlying route (AC-21). Page: §7.2 |

**Clickable, and nothing else is:** the `✕`; each tab; `Assign a captain`; the under-review
group's link to `PAY-6150`; `Open full profile`;
the back arrow; a ledger row's source link
where `sourceLinkFor` returns one; `View wallets` in the ledger's first-run state; each
`Learn more` where one exists. **The trip card as a whole is not a click target** — only its
button is, which is §9.1's rule for a row applied to a card.

**Tabs are URL state.** `?entity=RDR-4002&tab=money`. A sheet reopened from a link lands on
the tab the operator left. Default `activity`.

---

## 14. Findings, blockers and handoffs

**A — `DetailPage` needs a `below` slot.** Owner: **frontend-engineer** (`src/components/PageShell.tsx`).
`below?: ReactNode`, rendered after the grid at the content region's full width, inside
`PAGE_BLOCK`. Reason in §7.6 / D-RP-5. **Fallback if refused:** the ledger goes at the end of
`main` and scrolls horizontally at ≥ 1344 — `DataTable` is a bounded scroller and handles it —
and the defect is recorded rather than hidden. Do not invent a third option.

**B — `PageAction` has no `reason`.** Owner: **frontend-engineer** (`src/components/PageHeader.tsx`).
This is the fourth screen to hit it. Specified once, here:
```ts
type PageAction = { label: string; onClick: () => void; destructive?: boolean } &
  ({ disabled: true; reason: string } | { disabled?: false; reason?: never })
```
so a disabled action without a sentence does not compile. **Rendering: a third header row** —
one 12px `text-muted-foreground` line per disabled action, aligned to the action cluster's
inline-end, `id`-linked by `aria-describedby`, rendered only when something is disabled. Not a
tooltip (§11.2 requires real text; §5.7 confines a tooltip to naming a control). Not the
overflow menu — moving a control when it becomes disabled makes the header jump as state
changes, which trades one defect for another. **Disabled in place means in place.**

**C — One missing operation, and one question that is not mine.** Owner:
**mock-data-engineer**, with **product-owner** on the question.
- `renewSubscription(subscriptionId, signal): Promise<Subscription>` — `clients/subscriptions.ts`
  ships `freeze` and `cancel` and no renew. **`Renew plan` is therefore not built on either
  surface** — undeclared, not disabled: §11.2 governs a control the operator *may not* use,
  not one the product cannot perform. Its confirmation copy is deliberately unwritten (§12.5),
  because whether a renewal charges the wallet, starts today or at the old cycle's end, and
  whether it can be undone, are all unanswered — and writing the copy would be inventing the
  answers.
- Trip assignment. `clients/trips.ts` has no assign; `assignRequest` acts on a `RideRequest`.
  **This spec routes around it** — `Assign a captain` navigates to Live dispatch (§7.4) — so it
  is not a blocker. Say so if you disagree.
- **Releasing a payment hold: ruled out of scope (§8.3), not parked.** No operation exists and
  none should be built *for this surface*. **The question for product-owner is which surface
  owns a fraud case**, since that is where a release belongs if it belongs anywhere. That is a
  scope decision and it is not mine to take silently.
- **A command with no operation is not declared in `RIDER_COMMANDS` at all.** Both surfaces
  read the registry, so an absent command is absent from both, together. That is the contract
  working, not a gap.

**D — Two fixture comments make claims the data does not support.** Owner:
**mock-data-engineer**. Neither blocks the build; both will mislead the next reader.
- `payments.ts:641` says `PAY-6150` is pending *"so this amount sits on the separate `Pending`
  line and not inside the balance (AC-312)"*. Measured: `Ledger.pendingHalalas` for `RDR-4002`
  is **`0`**. The payment has `postingId: null` and posts to no rider ledger, so it never
  reaches that line. The behaviour is right; the comment describes a mechanism that is not
  wired.
- `types/trip.ts` calls `route` *"genuinely one field for a list row"*. It is a pre-joined
  string with a hardcoded `→`, which cannot mirror (§9.5) — see §10.2. `pickup` and
  `destination` exist and are populated; `route` should be treated as legacy display only.

*(The earlier "fixture does not match the reference" finding is **withdrawn**. The link arrays
on `Rider` are not read by the profile — every card queries by `riderId` — and `SUB-2003`,
`TRP-9104`, `PAY-6150` and `PAY-6151` all resolve. Verified by running the data layer.)*

**E — `Rider.status` invariant.** Owner: **mock-data-engineer**. `types/rider.ts` documents
`status` as derived from `subs.length`, so `on-demand` **means** "no subscriptions" — yet
`RDR-4002` is `on-demand` and `listSubscriptions({riderId})` returns `SUB-2003`. Both cannot
be true. Ruling: derive from **active** subscriptions only, so an expired plan correctly
leaves a rider on demand, and assert the invariant in a test. §8.2.

**F — Escrow is not on this screen, and the Q-F4 note is withdrawn with it.** `RDR-4002` has
no `EscrowHold`; `tripsRequired` appears in one fixture file and no row references this rider.
Q-F4 (a hold left by a mid-cycle cancellation) remains open for **product-owner** on the
Financials surfaces that do render escrow — it simply does not arise here.

**G0 — two stale comments left by the modal reversal.** Owner: **frontend-engineer**.
Neither breaks anything; both will mislead.
- `sheet.tsx` §1.2 / C12 still says *"`--ev-drawer-w` = 406px"*. `globals.css` has it at
  **480** since D7. The C12 *argument* is sound and is load-bearing — §6.1 leans on it — but
  its stated figure is two versions old.
- The `overlay` side, its scrim and `isModal` remain in `sheet.tsx` with no consumer now that
  the profile is a drawer again. Leave them or remove them, but do not let a reader infer from
  their presence that a layer somewhere is still a modal. If they stay, say what for.

**G1 — a design rationale is leaking onto an operator's screen.** Owner: **frontend-engineer**.
`profile.rider.refusal.assign` reads *"A captain is assigned on the dispatch board. This layer
commits nothing."* The second sentence names a design rule instead of a next step, and no
operator knows what a layer commits (§5.7). The first is mis-tensed — *"a captain **is**
assigned"* reads as *one already has been*, the opposite of the line above it. Final copy is
in §12.4: **`Captains are assigned on the dispatch board.`**

**G — `flagsOf()` builds four strings by concatenation.** Owner: whoever owns
`src/components/profile/rail.tsx`. `` `${t('profile.field.churnRisk')}: ${t(churn.key)}` ``
(`:273`) and the same shape for `openComplaints`, `planAccess` and `severity`. §9.6 forbids
it and it breaks under bidi. Each needs one key with a named param.

**H — `--ev-hero` gains a second consumer.** Recorded, not decided by me. The token's own
comment scopes it to *"every metric board"*. Extending it to the record band is a second
consumer of a sanctioned instrument, not a new colour — but if the token's owner wants that
written down, it belongs in `docs/06-design-reference/_partials/` and its build script, which
this spec may not touch.

**I — the empty meter segment's fill.** §6.6 proposes `--ev-hairline-strong`, which **R19**
licenses only for *"the resting boundary of an unchecked control"* and says *"any second use
needs a row in §6.2"*. If the R19 owner reads a meter segment as outside that, use
`--ev-border`. Raised rather than assumed.

---

## 15. Acceptance criteria

Testable, numbered, and ordered by the section they come from. QA owns these.

### The parity contract

1. **AC-RP-01** `SheetSlot` and `PageSlot` contain no member meaning "not shown". Asserted by
   type, and by a test that both unions' members are all reachable placements.
2. **AC-RP-02** `Object.keys(SHEET_PLACEMENT)`, `Object.keys(PAGE_PLACEMENT)` and
   `Object.keys(PROFILE_SECTION_RENDERERS)` are the same set. Adding a `ProfileSectionKey`
   without placing it fails to compile.
3. **AC-RP-03** For every rider fixture, the set of `data-fact` ids with `rank="summary"`
   rendered by the sheet equals the set rendered by the page — equality in both directions.
4. **AC-RP-04** For every rider fixture, every `data-fact` id rendered by the sheet is
   rendered by the page.
5. **AC-RP-05** Every section whose sheet fact set is a strict subset of its page fact set
   renders a `[data-truncation]` node stating the shortfall in words.
6. **AC-RP-06** No `factsFor…` builder takes a surface, presentation or slot argument.
7. **AC-RP-07** Both surfaces obtain their action list from
   `resolveCommands(RIDER_COMMANDS, …)`. Neither file contains a literal command id list.
8. **AC-RP-08** For the same record and operator, a command's `unavailableReason` returns an
   identical string on both surfaces.

### The band

9. **AC-RP-09** Both surfaces render the same `ProfileBand` component with the same five-part
   meta row, in the same order.
10. **AC-RP-10** The band's ground is `--ev-hero`; its four text ranks are
    `--ev-hero-fg` / `-fg-2` / `-fg-3` and its dividers `--ev-hero-line`. No literal hex, no
    Tailwind palette class, no `--ev-brand` as a surface fill.
11. **AC-RP-11** The band is the page's only `<h1>`. The page mounts no `PageHeader` title.
12. **AC-RP-12** The eyebrow is the only `uppercase tracking-wider` run on either surface.
13. **AC-RP-13** Under `dir="rtl"` the meta dividers render between items in reading order and
    no element uses `border-l` / `border-r`.

### The back affordance

14. **AC-RP-14** The page renders a single `←` at the inline-start of the band's name row, with
    `aria-label` and tooltip naming the destination (`Back to riders`), and it is the first tab
    stop.
15. **AC-RP-15** The glyph is `→` under `dir="rtl"`, swapped at construction via `mirrorGlyph`.
    No `scaleX(-1)` anywhere on the page.
16. **AC-RP-16** With `location.state.from` set, the arrow navigates there.
17. **AC-RP-17** With no `location.state.from` — deep link, fresh tab, reload — the arrow
    navigates to `INDEX_ROUTE[entityType].path`, not `history(-1)`, and does not leave the app.
18. **AC-RP-18** `INDEX_ROUTE` is total over `ProfileEntityType`; a missing entry fails to
    compile.
19. **AC-RP-19** The arrow renders and is enabled in the loading, error and not-found states.
20. **AC-RP-20** `Open full profile` sets `state.from` to the route the sheet was open over;
    Back from the page returns there **with the sheet re-opened**.

### The summary blocks and the strip

> **These criteria are about ORDER, not position.** The sheet stacks the summary above the
> tabs in one column (§6.2); the page lays the same blocks side by side in the strip (§7.1).
> "First", "last" and "above" are testable against both; "in the rail" and "beside" are not,
> and any criterion phrased that way has been re-worded rather than dropped. **The facts are
> identical on both surfaces — that is AC-RP-03's job, and it is unaffected by the axis.**

21. **AC-RP-21** The sheet's four summary blocks and the page's three strip cells render from
    one `ProfileSummaryBlock` component, with the same facts in the same order.
22. **AC-RP-22** `Churn risk` is **last** in the summary's order on both surfaces — the final
    stacked block on the sheet, the last cell's final line on the page.
22a. **AC-RP-22a** On the sheet the summary renders **before** the tab row in DOM order, and
    the two are separated by a **block-axis** rule. No inline-axis border separates them, so
    there is nothing at that seam to mirror.
23. **AC-RP-23** The held amount renders as `StatusBadge tone="warning"`, radius 8px, not a
    stadium.
24. **AC-RP-24** `Expired` renders in `--ev-ink`. **No element on either surface computes to
    `--ev-red` except a `RowCriticalMarker` in the ledger.**
24a. **AC-RP-24a** The `Wallet` block and the `Money` cell contain **no badge**. The only
    badge in that region is the one inside the under-review group, and it reads `Held`.
25. **AC-RP-25** `Churn risk` renders as label + value in text: no `Badge`, no `button`, no
    `href`, not in the tab order, and it carries its reason line.
26. **AC-RP-26** The strip's third cell is labelled `Plan`, and the label does not change with
    the value across all six `SubscriptionStatus` values.
27. **AC-RP-27** A rider with no subscription renders `No plan on this record` and **no em
    dash** in that cell.
28. **AC-RP-28** `Lifetime value 0.00 SAR` renders `0.00 SAR`, never `—` (§8.3.1).

### The meter

29. **AC-RP-29** With `tripsIncluded = 5`, exactly 5 segments render.
30. **AC-RP-30** With `tripsIncluded = 8`, exactly 8 segments render and the caption reads
    `0 of 8 trips used`.
31. **AC-RP-31** With `tripsIncluded = 20`, no segments render; a single `Progress` bar renders
    with the same caption.
32. **AC-RP-32** With `tripsIncluded = 0`, neither a meter nor a bar renders; the caption reads
    `No trip allowance on this plan`.
33. **AC-RP-33** With `tripsCompleted = 6` and `tripsIncluded = 5`, every segment is filled,
    no sixth appears, and the caption reads `6 of 5 trips used`.
34. **AC-RP-34** The meter is `aria-hidden="true"`; the caption is always rendered and is the
    only announced value.
35. **AC-RP-35** Under `dir="rtl"` the filled segments are at the inline-start. No `left`,
    `translateX` or `background-position` is used to fill it.

### The tabs

36. **AC-RP-36** Each tab's count equals the `total` behind it, not the number of rows shown.
    For `RDR-4002` they render **`Activity 4`** (`getRiderTimeline().total`) and **`Money 4`**
    (`getRiderMoneyMovements().movements.length`) against the live data layer.
37. **AC-RP-37** The two collections are **disjoint**, enforced by the data layer: no money
    movement appears in the timeline, so a top-up cannot be counted under both tabs.
37a. **AC-RP-37a** A subscription contributes **two** timeline events — started and expired —
    not one. `SUB-2003` produces both.
38. **AC-RP-38** `Identity` carries no count.
39. **AC-RP-39** While a tab's read is in flight, that tab renders **no count** — not `0`, not
    a rendered digit of any kind. A `0` before a read returns is indistinguishable from a real
    zero.
40. **AC-RP-40** The active tab is in the URL (`&tab=money`) and is restored on reload.
41. **AC-RP-41** Under `dir="rtl"`, `←` on the tab list moves to the *next* tab.

### The open-trip card

42. **AC-RP-42** Both surfaces render the eyebrow `Open right now`. The string
    `LIVE · REQUESTED` appears nowhere.
43. **AC-RP-43** The card's trip is selected by `OPEN_TRIP_STATUSES`, which includes
    `requested`. `TRP-9104` renders.
44. **AC-RP-44** `ACTIVE_TRIP_STATUSES` no longer exists under that name; the dispatch board
    uses `DISPATCH_BOARD_STATUSES` and both constants live in one file.
45. **AC-RP-45** The dot does not animate under any motion preference.
46. **AC-RP-46** The route renders as three nodes — `<bdi>`, mirrored arrow, `<bdi>` — built
    from `Trip.pickup` and `Trip.destination`, and the arrow is `←` under `dir="rtl"`.
46a. **AC-RP-46a** **`Trip.route` is never rendered on either surface.** Grep for `.route`
    across both surfaces' files returns nothing.
47. **AC-RP-47** `Assign a captain` is the only `variant="default"` button on each surface,
    and it is in the card **body** — never in the sheet's footer or the page's action cluster.
48. **AC-RP-48** On the **sheet** it renders **disabled, with its reason as real text beside
    it** (`aria-describedby`-linked, never a tooltip, never `title`); on the **page** it
    navigates to `/operations/dispatch?trip={id}`. **Neither mutates anything**, which is what
    keeps it legal under §6.2's restored *"the layer commits nothing"*.
48a. **AC-RP-48a** Its reason names the destination and **nothing about layers or commits**.
    `Captains are assigned on the dispatch board.` Where the trip already has a captain,
    `A captain is already on this trip.` renders instead — state beats capability.
49. **AC-RP-49** The trip card as a whole is not a click target.

### The movements table

50. **AC-RP-50** The table is `DataTable` with `table.mode === 'ledger'`.
51. **AC-RP-51** No checkbox column, no bulk bar, no row kebab, no sort control on any header.
    A sort call does not compile.
52. **AC-RP-52** Columns are exactly Date · Reference · Description · Debit · Credit · Balance,
    in that order, from `ledgerColumns`.
53. **AC-RP-53** Debit, Credit and Balance are `text-end` with `tabular-nums`, **in both
    `dir="ltr"` and `dir="rtl"`**.
54. **AC-RP-54** The unit appears once per money column, in the header, and in no cell.
55. **AC-RP-55** No row carries a value in both Debit and Credit; the other renders an em dash.
56. **AC-RP-56** Two boundary rows render — `Opening balance` at the top and `Closing balance`
    at the bottom — via `ledgerBoundaryRows`, with `alignTo: 'balance'`, and the screen renders
    no total row of its own.
57. **AC-RP-57** The closing balance equals the strip's wallet figure, from one field. For
    `RDR-4002` both read `200.00 SAR`, and the band's summary line reads **`2 movements`** —
    never `four movements`, and never a held figure.
58. **AC-RP-58** The Balance column renders `balanceAfterHalalas` verbatim; changing an earlier
    posting's amount in a fixture does not move a later row's balance.
59. **AC-RP-59** A pending posting renders `—` in Balance and its amount on the separate
    `Pending` line, never inside the balance.
60. **AC-RP-60** A negative balance renders U+2212, in ordinary ink, never in a badge and never
    in parentheses.
61. **AC-RP-61** A `failed` or `escalated` posting takes `RowCriticalMarker` **and** the word in
    its description. No badge.
62. **AC-RP-62** **AMENDED — `10-financials-money-flows.md` LR-2/LR-3/LR-4.** With
    `lifetimePostings === 0` the ledger renders the first-run empty as **heading, body and one
    action, and no illustration**. With history it renders `no-match` — the **period** sentence
    where nothing is narrowing, the **filters** sentence where something is, and never both.
    The three are never swapped, and the choice is made from `lifetimePostings`, never from
    `totalPostings` or the row count.
    *(This criterion previously read "illustration, heading, body, one action" and named two
    empties. **LR-3** rules that no Financials empty carries an illustration — an operator never
    creates a posting, so the picture would sit above an action the product does not offer — and
    **LR-4** draws three ledger empties, not two. The rider spec was written before that ruling
    and is corrected to it, so the rider and captain ledgers do not ship two answers.)*
63. **AC-RP-63** A truncated ledger states `Showing {shown} of {total} postings` below the last
    row.
64. **AC-RP-64** `sourceLinkFor` is the only per-row control, and it renders text rather than a
    link for a non-linkable source type.

### The side column

65. **AC-RP-65** `Rating`, `Renewal rate` and `Last trip` render through `splitAbsent()` as a
    single `Not recorded:` line naming all three, with **no em dashes and no value column**.
66. **AC-RP-66** Device facts render whenever any of the four has a value. For `RDR-4002` all
    four render.
67. **AC-RP-67** No composed absence sentence renders on either surface.
68. **AC-RP-68** Every value in the `Identity` card is wrapped in `<bdi>`; the Arabic address
    does not reorder under `dir="ltr"`.

### The footer and actions

69. **AC-RP-69** `Open full profile` is `variant="link"` at the footer's inline-start, with no
    `↗`.
70. **AC-RP-70** The sheet's footer contains **`Open full profile` and nothing else** — no
    button of any variant, disabled or otherwise. §6.2's *"the layer commits nothing"* is in
    force.
70a. **AC-RP-70a** The layer renders **no scrim**, does **not** trap focus, and a pointer-down
    outside it does not close it — the event reaches the page behind (AC-20).
70b. **AC-RP-70b** The sheet's body is **one column at every viewport width**, with no
    `compact:` variant deciding it. At 480px, on all three tabs, at 1280 and 1440, in both
    directions, **no descendant reports `scrollWidth > clientWidth`**.
70c. **AC-RP-70c** `--ev-drawer-w`, `globals.css`, `ShellLayer` and `sheet.tsx` are
    **unchanged** by this screen. The layout was solved by arrangement, not by widening a
    shared token.
71. **AC-RP-71** **No control on either surface releases, clears, approves or reverses a
    payment hold.** No such affordance renders in any state, enabled or disabled, and
    `RIDER_COMMANDS` declares no release command. Grep for `release` across both surfaces'
    files returns nothing.
72. **AC-RP-72** The held amount renders as a **separate labelled group below a rule** —
    `Payments under review` / `98.00 SAR` / `PAY-6150 · held 23 Jun` — and the wallet figure
    above it reads `200.00 SAR` with **nothing subtracted**.
73. **AC-RP-73** The under-review group links to `PAY-6150`'s row in the Money tab and is
    keyboard-reachable.
74. **AC-RP-74** `PAY-6150`'s own row badge reads `Held`, `tone="warning"` — the same word
    and tone `fin.settlement.held` gives every financials screen. The summary label above is
    `Payments under review` and **not** `Held`.
75. **AC-RP-75** `Ledger.pendingHalalas` for `RDR-4002` is `0`, no surface renders a
    `Pending` line for this rider, and no surface sums or subtracts the payment hold against
    the wallet balance.
75a. **AC-RP-75a** A rider with no pending-settlement payment renders **neither the
    under-review group nor its rule** — not a zero, not an em dash, not an empty label.
75b. **AC-RP-75b** **Neither surface mutates anything, so no toast fires from either.** No
    `sonner` call originates in any file this spec governs. If a committing control is added,
    it confirms **in place** — no second dialog element mounts inside the drawer (§5.5).
76. **AC-RP-76** The page header renders no `Churn risk` control, no record pager, and no
    `Renew plan` — the command is undeclared, so it is absent from **both** surfaces together
    rather than from one.
77. **AC-RP-77** Every action disabled by the loading state renders `Loading this record.` as
    real text.

### States

78. **AC-RP-78** All four base states render on both surfaces and are reachable from a mock
    client that can be made to fail.
79. **AC-RP-79** Loading is a skeleton shaped like the content on both surfaces. **No
    `Spinner` mounts anywhere on either surface.**
80. **AC-RP-80** A failed section read fails that section only; the other sections keep their
    content and the sheet stays dismissible.
81. **AC-RP-81** A 404 renders `no-match` naming the id searched — not `ErrorState` — and the
    sheet stays dismissible / the page's back arrow still works.
82. **AC-RP-82** Each of the eight empties in §9.3 renders its exact copy, and the three kinds
    are never interchanged.
83. **AC-RP-83** **AMENDED — LR-3.** **No illustration renders anywhere on either surface, in
    any state**, the ledger's first-run band included. R8 *permits* an illustration on a
    whole-page zero-records-ever state; it does not require one, and Financials declines it
    because an operator never creates a posting.
    *(This criterion previously licensed exactly one illustration. It now licenses none, which
    is simpler to test and puts the rider and the captain on one answer.)*
84. **AC-RP-84** Every domain state in §9.4 has fixture data and renders as specified.

### Arabic

85. **AC-RP-85** Both surfaces render correctly under `dir="rtl"`: no clipped element, no
    collapsed margin, no control on the wrong edge.
86. **AC-RP-86** No physical-direction utility (`ml-` `mr-` `pl-` `pr-` `left-` `right-`
    `text-left` `text-right` `border-l` `border-r` `rounded-l-` `rounded-r-`) appears in any
    file this spec governs. `/token-audit` passes.
87. **AC-RP-87** `+966 59 448 7070` renders in the same character order in both directions.
88. **AC-RP-88** `200.00 SAR` keeps `SAR` trailing under `dir="rtl"`.
89. **AC-RP-89** Money column alignment does not flip under `dir="rtl"` (R4).
90. **AC-RP-90** Digits are Western `0–9` in both languages.
91. **AC-RP-91** No string on either surface is assembled by `+` or by a template literal
    joining two translated fragments. Every one is a key with named params.
92. **AC-RP-92** `✕`, `·`, `●` and `▾` do not mirror. `←` and `→` do.

### Tokens and accessibility

93. **AC-RP-93** No Tailwind palette class and no arbitrary value in any governed file.
94. **AC-RP-94** Every interactive element has a visible `focus-visible` ring; no `outline-none`
    without one.
95. **AC-RP-95** Every badge takes one of R7's five tones. No sixth, no red.
96. **AC-RP-96** Every status, risk and settlement state is carried by a **word** as well as by
    any colour (§7.5).
97. **AC-RP-97** All band text clears its measured ratio: name and figures 13.44 : 1, meta
    8.61 : 1, eyebrow 5.89 : 1.
98. **AC-RP-98** **Neither surface traps focus.** The sheet moves focus in on open, Tab leaves
    it and continues into the page, and `Escape` closes and restores focus to the opener.
99. **AC-RP-99** Every spacing value is on the 4px grid (§6.3 D15) — this holds regardless of
    which deviation is in force, and **D-2 may not be cited to make anything smaller**.
100. **AC-RP-100** No motion loops. The `Open right now` dot is static and nothing on either
     surface animates for longer than 300ms.

---

## 16. OWNER AMENDMENT 3 — the explanatory sentences, and the ⓘ that is refused

**Instruction, verbatim:** *"I want you to read the driver and rider,
pages, and sheets and remove any un neded comments or really secondary and add them in an i
icon with a tool tip to tell that info"*. **"Comments" means the on-screen explanatory
sentences**, not code comments.

**This is the rider half of one ruling.** The captain half is
[`people-captain-profile.md` §13](./people-captain-profile.md), written in the same pass. **§13
holds the full argument, the reference evidence and the seven-reason refusal of the ⓘ; this
section does not restate it.** What is here is the rider's own inventory, its one deletion, and
the one asymmetry between this page and this sheet that a reader will otherwise file as a parity
defect.

**A builder waiting on this needs §16.2 and §16.3.**

### 16.1 The test, inherited

§13.1 in full, unchanged:

> **The removal test.** Delete the sentence and read the figure again. If the figure still
> means exactly one thing, the sentence was **commentary** — delete it. If the figure now means
> two things, the sentence is **the answer** — it stays, visible, in ordinary text.

with its four corollaries: **A** already behind a disclosure → out of scope; **B** the block's
sole content → stays; **C** renders only when an uncommon condition is true → a fact about the
record, stays; **D** renders on every record in every state under a figure its own label already
names → **this is the clutter.**

**The rider surfaces are far cleaner than the captain's, and the measurement says so.** A
Chromium probe of `/entity/RDR-4002` surfaced exactly one candidate outside the sheet's rail:
`2 payments · 98.00 SAR under review`, which is a **count and an amount** — a fact, not a
sentence. **Rule D catches exactly one string on this record, and it is in the sheet only.**

### 16.2 THE AFFORDANCE RULING — D-RP-6: no tooltip and no popover on either rider surface

> **D-RP-6.** Neither rider surface carries a tooltip, a popover, a hover card or a `title`
> attribute that holds an explanation. `ReturnControl`'s destination tooltip — which this spec's
> own §7.2 introduced under owner amendment 1 — remains the only tooltip on either surface, and
> its rule is unchanged: *it names the control and carries no explanation.*

The seven reasons are `people-captain-profile.md` §13.2 and they apply verbatim. **Three bind
harder here than on the captain**, and they are the reason the answer does not change between
the 480px sheet and the page:

1. **`RiderRail.tsx` contains zero `<button>`, `<a>`, `<Button>` or `<Link>`** — verified by
   grep. The rail is a pure readout. Putting an ⓘ in it converts a region that costs the
   keyboard nothing into one an operator tabs through on the way to the tabs, in a drawer where
   `Tab` **leaves and continues into the page** (§6.1, no focus trap) — so the stops are on the
   path out, not in a dead end.
2. **The sheet is 480px and the rail is a single column.** §6.1 refused a widening **twice**, on
   measurement, in writing. A per-line control on the surface whose width is already the
   binding constraint is the wrong direction.
3. **§3's parity contract is on facts.** A fact that is hoverable on the page and plain on the
   sheet — or present on one and absent on the other — is precisely what that contract exists to
   prevent. So the ruling is one ruling for both surfaces.

**If the ⓘ is ordered anyway**, the one permitted shape is
`people-captain-profile.md` §13.6 — a **popover**, not a tooltip, one per card, a real
`<button>`, click/tap-triggered, accessible name `About these figures`, content keeping its
sentence periods (`DESIGN.md:3292` names *toast, tooltip, badge, menu item* and **not** popover).
It carries a self-voiding test and that test is AC-RP-110.

### 16.3 THE TABLE — every string on both rider surfaces

Rendered strings only, `t()` keys resolved. `⟳` = renders on every record in every state.

#### The sheet's rail

| # | String | Where | Verdict |
|---|---|---|---|
| 1 | `Captured, not settled. Not part of the balance.` ⟳ | `RiderRail.tsx:167`, under the `Payments under review` figure | **DELETE the key, KEEP one clause via a string that already exists** — see #2. Clause 1 restates the block's own label: `Payments under review` already says *not settled*, and the settlement badge on each money row says which state it is in. Clause 2 is the only load-bearing half. |
| 2 | — *(re-used, not new)* `Not counted in the wallet balance` | same position | **REPLACES #1.** This is `profile.rider.money.outsideBalance`, **already declared, already translated, already reasoned** — the rows it labels in the Money tab make the identical statement. Using the shipped string rather than minting a second one is this spec's own rule: *a second spelling of a shared sentence is a second contract that has not noticed yet*. **Two sentences become one fragment, and the dictionary gets smaller.** |
| 3 | `Payments under review` ⟳ | rail block label | **STAYS.** It is the block's heading and §8.3.4's *separate labelled line*. Deliberately not `Held` — §12.1 already ruled that `Held` under a wallet balance reads as *held out of your balance*, which is false. |
| 4 | `No negative signal on record.` | `RiderRail.tsx:259`, `RiderProfilePage.tsx:646`, when `churnReason === null` | **STAYS.** Rule B — it is the `Churn risk` block's reason line, and §8.2 makes the reason mandatory. `churnReason === null` is a **real value** meaning *no negative signal*, and §3.5 requires a sentence rather than a blank. Demote it and a `Low` churn block is a word over nothing. |
| 5 | `rider.churn.*` — `No subscription — quick rides only.` · `A cancelled subscription is on record.` · `Complaints on record: {count}` · `Rating below 4.` · `Renewal rate {percent}%.` · `The plan lapsed with nothing used.` | same position, when there is a reason | **STAYS, all six.** §8.2 — a derived value states its reason. **The reason IS the answer** to the question `Churn risk: High` raises, and it is the only thing on the block that tells an operator what to do. Hiding the reason behind hover while leaving the risk word visible is the exact inversion §7.5 forbids. |
| 6 | `No plan on this record` · `{plan} · ends {date}` · `{used} of {total} trips used` · `Since {date}` | `Plan` block | **STAYS.** Facts. The meter is `aria-hidden`; the caption **is** the value. |
| 7 | `No trip allowance on this plan` | when `tripsIncluded === 0` | **STAYS.** Rule C — §6.6's zero case; an empty meter would claim a quota that does not exist. |

#### The page's strip

| # | String | Where | Verdict |
|---|---|---|---|
| 8 | `SAR in wallet` ⟳ | `RiderProfilePage.tsx:463` | **STAYS.** Removal test: `200.00` alone is a balance, a lifetime value or a fare. It is the figure's unit and subject, not commentary. |
| 9 | `Balance is below zero` | when negative | **STAYS.** Rule C, and §7.5 — a negative balance is U+2212 in ordinary ink and the condition must be carried by a **word** as well. This is that word. Never red, never a badge (R5a). |
| 10 | `{n} quick rides` · `last trip {date}` · `last trip not recorded` · `Lifetime value` | strip | **STAYS.** Facts. |
| 11 | **No held/under-review line at all** ⟳ | strip, `Money` cell | **STAYS ABSENT — and this is deliberate, not a parity defect. See §16.4.** |

#### Both surfaces — panels, cards, tables

| # | String | Verdict |
|---|---|---|
| 12 | `Not counted in the wallet balance` — per money row, when `inWalletBalance` is false | **STAYS, per row, unchanged.** It is not commentary: it names **which rows** are outside the balance, and that is a property of the row. Rule C — it renders only on the rows it is true of. `RiderPanels.tsx:429` states the stake: the rows do not sum to the balance and an operator adding the column up *"would reasonably conclude the screen is wrong"*. |
| 13 | `A captain is on this trip.` · `No captain assigned yet.` | **STAYS.** The open-trip card's whole question, answered beside the `Assign a captain` control. Rule B. |
| 14 | `Captains are assigned on the dispatch board.` · `A captain is already on this trip.` · `Opening dispatch needs the operations permission.` | **STAYS, and may never be a tooltip.** §11.2 — a refusal is real text, `aria-describedby`-linked, never hidden. `design/12-refusal-and-undo-surfaces.md` §2.4: *"Neither surface may use a tooltip, ever."* Already ruled; §13.2 reason 5. |
| 15 | `Nothing has happened on this record yet.` · `No money has moved on this record yet.` · `No trip is open right now.` · `No movements match this search.` · `No payments match this search.` · `No money has moved yet` + body · `No card payments yet` + body | **STAYS, all.** Rule B. An empty state behind an ⓘ is a blank card — exactly what `copy.md` rule 10 and R8 forbid. |
| 16 | `Showing {shown} of {total}.` | **STAYS.** §5.4 / §8.3.4 — a truncated list states its truncation in words. A silent cap must not ship. |
| 17 | `{total} on record · {open} open` · `{total} on record · none open` · `None` | **STAYS.** §12.1 already ruled that `{total: 3, open: 0}` and `{total: 0}` are different states and take different sentences. Facts. |
| 18 | `Joined {date}` · `{id} · {date} · {status}` · `{origin} to {destination}` · `{n} more open` | **STAYS.** Facts. |
| 19 | `2 payments · 98.00 SAR under review` (`entity.rider.payments.count` + `.underReview`) | **STAYS.** A count and an amount over the group whose records they describe. The probe surfaced this as the page's only candidate; it is not a sentence and not a definition. |

**Net effect: one key deleted, one key re-used, nothing added.** The rider dictionary gets one
string smaller and the rail loses one line.

```
  before (sheet rail)                     after
  PAYMENTS UNDER REVIEW                   PAYMENTS UNDER REVIEW
  98.00  SAR                              98.00  SAR
  Captured, not settled. Not part         Not counted in the wallet balance
  of the balance.
```

### 16.4 The page has no held line and the sheet does — intentional, and recorded so it is not "fixed"

A reader comparing the two surfaces will find `Payments under review` as a rail block on the
sheet and **nothing** in the page's `Money` strip cell, and reach for §3's parity contract.
**Do not.** The two surfaces put the figure in different places, and the caption follows the
placement rather than the fact:

- **The sheet** stacks `Wallet 200.00` and then `Payments under review 98.00` as the next block
  in one column. The 98.00 sits directly beneath a balance it is not part of, so the misread is
  available and one line has to close it. That is what #2 is for.
- **The page** deliberately renders **no held line in the strip at all** —
  `RiderProfilePage.tsx:454` says so and gives the reason: *"`held` printed under a balance
  reads as held out of your balance, which would be a false statement."* The figure appears once
  on the page, over the `Payments` group where its records are, as
  `2 payments · 98.00 SAR under review`. **The page never creates the misread, so it needs no
  sentence to close one.**

**§3's contract is that the same facts are present at the same rank on both surfaces**, not that
the same *captions about layout* appear. `heldHalalas` is present on both, at figure rank on
both. What differs is a reconciliation line whose need is created by the sheet's single-column
stack. **A caption is not a fact; it is a repair for an adjacency.** Recorded as AC-RP-109.

### 16.5 Copy — final

**Deleted. One key, English and Arabic.**

| Key | Was |
|---|---|
| `profile.rider.rail.underReviewNote` | `Captured, not settled. Not part of the balance.` |

`src/components/profile/rider/copy.ts:61` and `src/i18n/ar/riderProfile.ts:23`.

**Added. None.** `RiderRail.tsx:167` renders **`profile.rider.money.outsideBalance`** in its
place — the key that already exists:

| Key | English | Arabic |
|---|---|---|
| `profile.rider.money.outsideBalance` | `Not counted in the wallet balance` | `غير محتسبة ضمن رصيد المحفظة` |

- **Fragment, no period, both languages** (R6) — unchanged from what ships today on the money
  rows.
- **The rank differs by context and that is correct**: `text-xs text-muted-foreground` in the
  rail, where it is the block's only secondary line; `text-2xs text-muted-foreground` on a money
  row, where it is a third line under a label and a timestamp. Same string, same meaning, rank
  set by its neighbours (§2.3).
- **Its comment in `copy.ts` must be widened** when the key gains its second call site: it
  currently reads *"Said on the rows it is true of"* and will be true of a rail block as well.
  A comment that names one of two call sites is how the second one gets deleted.

**Unchanged, and named so a builder does not "tidy" them by mistake:**
`profile.rider.rail.churnNone`, `.underReview`, `.noPlan`, `.planLegs`, `.since`, every
`rider.churn.*`, `profile.rider.activity.*`, `profile.rider.money.empty`, every
`profile.rider.support.*`, every `profile.rider.refusal.*`, `rider.trip.noCaptainYet`, and
every `entity.rider.*` string on the page.

### 16.6 Deviations — there are none

Identical to `people-captain-profile.md` §13.7, which checks each candidate rule one at a time.
The short form:

- **`DESIGN.md:3291`** (*constraints in helper text, not a tooltip*) and **`:3278`**'s
  `(tooltip on an ⓘ icon)` **Don't** are **§5.7 — §1–§5**, and the Precedence ladder makes them
  descriptions of the inherited baseline rather than orders to Eyvar unless §6 adopts them. §6 does not adopt
  them for captions on read-only figures, and both are written about **form fields** in any
  case. **Nothing is suspended.** This amendment moves in the same direction as those rules: it
  takes prose out of tooltips by never putting it in one.
- **`DESIGN.md:3107`** (*every icon-only control gets a ≤3-word tooltip*) is **not reached** —
  no icon-only control is added. `ReturnControl` already satisfies it.
- **`DESIGN.md:3292`** (*no period on a tooltip*) is **not reached** — no tooltip is added.
  §13.6 resolves it for the override case, and the resolution is that a popover is not on that
  rule's list.
- **§8.3.4** (*a pending amount MUST appear as a separate labelled line beneath the balance*) is
  **satisfied, unchanged** — the rail **block** is the labelled line. The sentence under it never
  was.
- **§8.2** (*a derived value states its derivation*) is **satisfied** — every `rider.churn.*`
  reason is untouched.

**The gap this exposes in `DESIGN.md` is finding CP-P1** in the captain spec: the document has
no rule for *secondary explanation on a read-only record*, because §5.7 and §5.0 are both
written about fields and controls. **A gap, not a deviation.** Proposed wording is in §13.8 and
is raised to the owner of `docs/06-design-reference/_partials/`. I do not edit `DESIGN.md`.

### 16.7 Findings

- **RP-P1 — `profile.rider.rail.underReviewNote` had one call site and two clauses, and only one
  clause was load-bearing.** Recorded because it is the shape to look for elsewhere: a caption
  whose first clause restates its own block label.
- **RP-P2 — the page/sheet held-figure asymmetry is intentional** (§16.4). It has been reached
  and re-litigated once already; §16.4 exists so it is not reached a third time.
- **RP-P3 — `profile.state.emptyCommitment` = `No missed legs recorded. Commitment is clean.`
  has the same two-clause shape** — clause 2 restates clause 1 — and lives in
  `src/components/profile/copy.ts:50`, which **neither rider surface renders**. Out of this
  amendment's scope, and flagged for whoever owns the generic profile sections so it is fixed
  where it ships rather than here.
- **RP-P4 — `docs/ref/copy.md` rule 7 presents a §1–§5 MUST as flat law**, with no ladder
  caveat. See CP-P2 in the captain spec. Owner of `docs/ref/` to decide; not my file.

### 16.8 Acceptance criteria — owner amendment 3

101. **AC-RP-101** No `Tooltip`, `TooltipTrigger`, `TooltipContent`, `Popover`, `HoverCard` or
     `title=` attribute appears anywhere in `src/components/profile/rider/*` or
     `src/screens/entity/RiderProfilePage.tsx`. **`ReturnControl`'s destination tooltip remains
     the only tooltip on either rider surface.**
102. **AC-RP-102** `RiderRail` contains **zero focusable elements**. `within(rail).queryAllByRole('button')`
     and `queryAllByRole('link')` are both empty.
103. **AC-RP-103** No string on either rider surface is reachable only by hover. Every rendered
     sentence is in the accessibility tree at rest.
104. **AC-RP-104** `profile.rider.rail.underReviewNote` is **deleted** from
     `src/components/profile/rider/copy.ts` and `src/i18n/ar/riderProfile.ts`. Grep returns no
     key and no consumer.
105. **AC-RP-105** The `Payments under review` rail block renders
     `profile.rider.money.outsideBalance` in its place — **the same key the money rows render**.
     No new key is declared for this fact.
106. **AC-RP-106** That block renders **one** secondary line, not two. It rendered two sentences.
107. **AC-RP-107** `profile.rider.money.outsideBalance` still renders per money row, **only** on
     rows where `inWalletBalance` is false, unchanged.
108. **AC-RP-108** `profile.rider.rail.churnNone` and every `rider.churn.*` reason render
     unchanged, in ordinary text, on both surfaces. A `Churn risk` block is never a word over a
     blank (§8.2, §3.5).
109. **AC-RP-109** The page's `Money` strip cell renders **no held or under-review line**, and
     the sheet's rail renders the block **with** its one caption. This asymmetry is asserted, not
     tolerated: a test names both and cites §16.4.
110. **AC-RP-110** *(applies only if §13.6 is invoked)* Every string placed inside a popover
     passes §16.1's removal test — the figure it accompanies means exactly one thing without it.
     **A string that fails the test may not be put in the popover.**
111. **AC-RP-111** `rider.test.tsx` asserts that `Captured, not settled.` renders **nowhere** on
     either surface, **in both languages**.
112. **AC-RP-112** Nothing in this amendment adds a token, a Tailwind palette class, an arbitrary
     value, a raw hex, a physical-direction utility, a badge tone or an illustration.
     `/token-audit` passes.
