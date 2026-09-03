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
hangs off), then your surface's section. `§14` is the numbered acceptance criteria.

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
  or a measured Navattic/Eyvar figure carried by name.

Reference evidence opened for this spec, cited where used:

| File | What it settles |
|---|---|
| `04-customers/customer-detail-no-orders-yet.webp` | main + rail on a person record; identity facts live in the rail; the empty main card is one grey sentence with one action |
| `02-orders/order-detail-unfulfilled-payment-pending.webp` | the money summary card; card-local actions (`Fulfill item`, `Create shipping label`) that navigate rather than mutate in place |
| `02-orders/orders-list-with-metrics-row.webp` | the three-up summary band: **sentence-case labels above values, divided by vertical rules** |
| `02-orders/order-detail-timeline-full-history.webp` | the timeline: date heading, a dot at the inline-start of each row, timestamp at the inline-end, no connecting rule. Also the **`Fraud analysis` rail card**, where a *risk level* renders as a labelled scale — never a badge, never red |

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

**Modal, scrim, focus trapped.** Already shipped: `ShellLayer presentation="modal"`,
`side="overlay"`, `inset-6`, `rounded-xl`, `max-w-measure` (1440), full-bleed under
`compact:`. §7.3.3 — *the scrim decides the trap* — so the trap follows from the scrim and
nothing else needs deciding.

Three §6.1/§6.2 clauses this design departs from, each named in §11: the drawer geometry (already
departed from, in code), the collapsible card stack, and *"the layer commits nothing"*.

### 6.2 Layout — main + rail, inside the modal

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  ProfileBand  (§5)                                                              ✕    │
├───────────────────────────┬──────────────────────────────────────────────────────────┤
│ bg-muted                  │ bg-background                                            │
│                           │  ┌ Activity 3 ┬ Money 4 ┬ Identity ┐                     │
│  Wallet                   │  └────────────┴─────────┴──────────┴───────────────────┐ │
│  200.00 SAR               │                                                        │ │
│  Lifetime value 0.00 SAR  │   Open right now                                       │ │
│  · · · · · · · · · · · ·  │  ┌──────────────────────────────────────────────────┐  │ │
│  Payments under review    │  │ حي حطين  ←  مستشفى الملك فيصل التخصصي   0.00 SAR │  │ │
│  98.00 SAR    ⟨ Held ⟩    │  │ TRP-9104 · 25 Jun 09:11 · Requested              │  │ │
│  PAY-6150 · held 23 Jun   │  ├──────────────────────────────────────────────────┤  │ │
│  ─────────────────────    │  │ No captain assigned yet    [ Assign a captain ]  │  │ │
│  Plan                     │  └──────────────────────────────────────────────────┘  │ │
│  Expired                  │                                                        │ │
│  ▭▭▭▭▭                    │   Earlier                                              │ │
│  0 of 5 trips used        │   Account registered            22 Jun · Riyadh, SA    │ │
│  Weekly Economy · 1–8 Jun │   …                                                    │ │
│  ─────────────────────    │                                                        │ │
│  Trips completed          │                                                        │ │
│  0                        │                                                        │ │
│  Since 22 Jun             │                                                        │ │
│  ─────────────────────    │                                                        │ │
│  Churn risk               │                                                        │ │
│  High                     │                                                        │ │
│  Lapsed with nothing used │                                                        │ │
│                           │                                                        │ │
│  │← ~1/3, min 260px →│    │  │←────────────── ~2/3, minmax(0,1fr) ──────────────→│ │ │
├───────────────────────────┴──────────────────────────────────────────────────────────┤
│  Open full profile                                                    [ Renew plan ] │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

- `grid-template-columns: minmax(260px, 1fr) minmax(0, 2fr)`. **The 2 : 1 ratio binds; the px
  are indicative** (§7.2, R13).
- Under `compact:` the grid collapses to one column and the rail **restacks above** the tab
  row — it is the summary, and a summary below its own detail is not a summary. This is the
  one place the sheet's restack differs from §7.2's rail-below rule, and it differs because
  the sheet's rail is above-the-fold chrome, not a set of §2.2 rail cards.
- Both columns scroll as one region. The band and the footer do not scroll (§6.1).

### 6.3 The rail — four blocks

One block shape, four instances. `ProfileSummaryBlock`, in
`src/components/profile/SummaryBlock.tsx`, shared with the page's strip (§7.4).

```
Label            text-xs text-muted-foreground, sentence case
Value            text-kpi tabular-nums text-foreground        ← the figure
[aside]          a badge, a meter, or nothing
Caption          text-xs text-muted-foreground                ← always present
```

Blocks are separated by `border-block-end border-border`, not by cards. The rail ground is
`bg-muted` — see §11 D-RP-2.

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

**The arithmetic, against the real fixture** — measured by running the data layer, not
assumed. `SECTIONS.rider` declares eight sections and a rider has no `disputes` or `fairness`
section at all, so `CMP-343` does not appear on this profile:

| Tab | Sections | Count |
|---|---|---|
| `Activity` | `subscriptions` 1 + `trips` 1 + `movement` 1 + `tickets` 0 | **3** |
| `Money` | `wallet` 2 postings + `payments` 2 | **4** |
| `Identity` | `identity`, `devices` — fields, not records | **none** |

That is exactly the `Activity 3` / `Money 4` the owner drew, and it is what settles
`subscriptions` into Activity: with it in Money the two counts would read 2 and 5, and both
would contradict the reference. **The drawn counts are evidence, and they agree with the
placement map.**

Tab labels, final: `Activity` · `Money` · `Identity`. Sentence case, no counts in the string.

### 6.5 The open-trip card

The **one filled button on the sheet** lives here (R3: the primary is the only filled button
on the screen).

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
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  Open full profile                                                    [ Renew plan ] │
└──────────────────────────────────────────────────────────────────────────────────────┘
   link, variant="link", inline-start                    secondary buttons, inline-end
```

- `Open full profile` — `Button variant="link"`, inline-start, as §6.2 requires.
  **No `↗`.** §9.5 classifies `↗` as the *external-link* mark; this navigates in place, and
  teaching the operator that `↗` means nothing in particular costs more than the glyph buys.
- Inline-end: record-scoped commands from `RIDER_COMMANDS`, at most two, **all
  `variant="secondary"`**. There is no primary in the footer: R3 gives the surface one filled
  button and it is the open-trip card's `Assign a captain`.
- `Release 98.00` is **not** here and is not anywhere else either — releasing a fraud-review
  hold is ruled out of scope for this surface. §8.3.
- §6.2's *"no primary — the layer commits nothing"* is **suspended**; see §11 D-RP-3.

---

## 7. Reference B — the full page, `/entity/:entityId`

### 7.1 Layout

```
┌─ content region ───────────────────────────────────────────────────────────────────┐
│ ┌────────────────────────────────────────────────────────────────────────────────┐ │
│ │ ←  ProfileBand (§5)                                        [ Renew plan ]      │ │  band
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
│ │ │ حي حطين ← مستشفى ...   0.00 SAR [Assign]│ │  │ Status  On demand            │  │
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
| `rider.renewPlan` — `Renew plan` | the rider's current subscription (there is at most one) | the action cluster: page header / sheet footer. `variant="secondary"` | yes |
| ~~`escrow.release`~~ | — | **nowhere. Ruled out of scope — §8.3** | — |
| `trip.assign` — `Assign a captain` | **one trip** | the open-trip card. `variant="default"` — the one filled button | yes |
| `profile.openFullPage` — `Open full profile` | navigation | sheet footer, inline-start, `variant="link"` | sheet only |

Consequences, each of which removes a duplicate the references drew:

- **`Assign a captain` leaves the page header.** Its target is `TRP-9104`, not the rider; a
  page about a rider whose primary action mutates a different record is a category error, and
  with two open trips the header button would be ambiguous while the card button never is.
  R3 also refuses it: two filled buttons on one surface.
- **`Release` leaves the sheet footer and does not land anywhere else.** §8.3.
- **No record pager `‹ ›`.** §8 slot 5 permits one on *"record-detail pages in an ordered list
  only"*. `/entity/:id` is reached from search, from any table, from a notification and from
  the sheet; there is no list, so there is no pager.

**`Assign a captain` navigates.** There is no client operation that assigns a captain to a
`Trip` (`clients/trips.ts` ships `setTripFlag` and nothing else; `assignRequest` acts on a
`RideRequest`). Rather than ship a dead button or invent an operation, the control opens Live
dispatch focused on this trip: `/operations/dispatch?trip=TRP-9104`. Shopify's own precedent
is in the frame I opened — `Fulfill item` and `Create shipping label` on
`order-detail-unfulfilled-payment-pending.webp` both navigate to where the work is done.
Assignment needs a map and a captain list; a profile has neither.

**`Release` is gone. See §8.3 for the ruling and its reasoning.**

**Confirmation, for whatever commits.** A committing action inside the profile **modal**
cannot open a §5.3 confirmation dialog, because §5.5 forbids a modal nested inside a modal.
Ruled: **confirm in place, on both surfaces**, using §4.7's expand-in-place pattern that §6.4
already sanctions for the account layer. One mechanism, both surfaces, and everything §5.3
asks for survives — a question naming the object, a body saying what does *not* change, and a
primary restating the verb. This currently applies to `Renew plan` and to nothing else.

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

**The reference's `four movements · 98.00 SAR still held` is wrong on both counts** and
neither half survives: there are two postings, and the 98.00 is a payment on another ledger
(§6.3.1). The held figure does not appear on the wallet band at all.

### 7.7 The `History` timeline

§3.8. Reference: `02-orders/order-detail-timeline-full-history.webp`.

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
  prediction wearing status chrome claims a certainty the value does not have. Shopify makes
  the same call in the frame I opened: `order-detail-timeline-full-history.webp` renders
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
| Ledger, **no postings ever** (`lifetimePostings === 0`) | **first-run**, whole band | heading `No money has moved yet` · body `This rider's wallet has no postings. Movements appear here as trips are paid for and refunds are issued.` · action `View wallets` |
| Ledger, has history, window empty | `no-match` | `No postings in this range.` + `Clear all filters` (supplied by `DataTable`) |
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
| **D-RP-2** | `--ev-bg2` gains a **seventh job: the record-summary band** (the sheet's rail, the page's strip) | §6.2 **D-11**'s derived list of six jobs for the one subdued fill | The fill does work a border cannot: it says *this is a readout of what is below, not another card of content*. Shopify solves the same band with a border (`orders-list-with-metrics-row.webp`) because its canvas is grey and its cards white — an inversion **D7 removed**, so the borrowed treatment does not transfer. **No new colour and no new token**, which is what the "no new colour" rule exists to protect. |
| **D-RP-3** | The sheet's footer **carries committing actions** | `00-shell.md` **§6.2**, *"`Open full profile` as a plain link at inline-start; no primary — the layer commits nothing"* | That clause rested on §6.1's premise — a 406px no-scrim drawer *consulted beside* the work. The premise is already gone: the layer is `presentation="modal"` on the owner's instruction, and §6.1's own footer rule then applies on its own terms (*"present only when the layer commits"*). Refusing footer actions while the body already carries `Assign a captain` would be incoherent. The link stays at the inline-start exactly as §6.2 requires, and there is still **no primary** in the footer (R3 spends the one filled button on the trip card). |
| **D-RP-4** | A committing action **confirms in place** rather than in a modal | §5.0, *"Destructive / irreversible → Modal"* | §5.5 forbids a modal nested inside the profile modal, and one confirmation mechanism across both surfaces is worth more than the modal's chrome. §4.7's expand-in-place pattern is already sanctioned for exactly this in §6.4. Everything §5.3 requires survives: a question naming the object, a body saying what does not change, a primary restating the verb. Applies to `Renew plan` and, today, to nothing else. |
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
| **X-16** | `four movements · 98.00 SAR still held` | `2 movements` | Measured: `totalPostings` is 2, and the held payment is not a wallet posting |
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
| `profile.action.renew` | `Renew plan` | `secondary` |
| `shell.layer.openFullProfile` | `Open full profile` | `link` |
| `profile.back.riders` | `Back to riders` | `aria-label` + tooltip on the `←` |
| `shell.layer.close` | `Close` | `aria-label` on the `✕` |

### 12.4 Refusals — §11.2's sentences, in full

| Key | English |
|---|---|
| `profile.refuse.renewNoPlan` | `This rider has no plan to renew.` |
| `profile.refuse.loading` | `Loading this record.` |
| `profile.refuse.permission` | *(from `roleRefusal`, never worded here)* |

### 12.5 Confirmation

| Key | English |
|---|---|
| `profile.confirm.renew.question` | `Renew Weekly Economy for this rider?` — `Renew {plan} for this rider?` |
| `profile.confirm.renew.body` | `A new cycle starts today. The rider's wallet balance and trip history do not change.` |
| `profile.confirm.renew.primary` | `Renew plan` |
| `profile.confirm.cancel` | `Cancel` |

Rendered **in place** (D-RP-4), never as a nested dialog. The exact charge wording is settled
when `renewSubscription` lands and its semantics are known — flagged in §13 C rather than
guessed at here.

### 12.6 Toasts — R9: one line, names the object exactly, ≤ 60 characters, no period

| Event | Toast | Chars |
|---|---|---|
| Plan renewed | `Plan renewed for RDR-4002` | 25 |

**One toast, because there is one mutation on this screen.** It names the object exactly and
carries no action link, no emoji and no period. If the object name grows, **truncate the
object, never the verb**.

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

**Tab order, sheet:** heading (focus lands here on open) → `✕` → rail blocks' controls
(the under-review link) → tab list → active panel → footer link → footer actions. **Focus is trapped**
(the scrim decides the trap, §7.3.3). `Escape` closes and returns focus to the opener.

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
group's link to `PAY-6150`; `Renew plan` and its in-place confirm pair; `Open full profile`;
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
  ships `freeze` and `cancel` and no renew. `Renew plan` cannot ship without it, and its
  confirmation copy (§12.5) is provisional until the operation's semantics are known: whether
  it charges the wallet, starts today or on the old cycle's end date, and whether it can be
  undone.
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

### The summary rail and strip

21. **AC-RP-21** The four rail blocks and the three strip cells render from one
    `ProfileSummaryBlock` component.
22. **AC-RP-22** The `Churn risk` block is pinned to the rail's block-end.
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
    For `RDR-4002` they render **`Activity 3`** and **`Money 4`** against the live data layer.
37. **AC-RP-37** No record is counted under two tabs. The wallet postings are counted under
    `Money` only and do not appear in `Activity`. `subscriptions` is counted under `Activity`.
38. **AC-RP-38** `Identity` carries no count.
39. **AC-RP-39** While any section behind a tab is loading, that tab renders **no count** —
    not `0`, not a skeleton.
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
47. **AC-RP-47** `Assign a captain` is the only `variant="default"` button on each surface.
48. **AC-RP-48** `Assign a captain` navigates to `/operations/dispatch?trip={id}` and performs
    no mutation.
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
62. **AC-RP-62** With `lifetimePostings === 0` the ledger renders the first-run empty
    (illustration, heading, body, one action). With history and an empty window it renders
    `no-match`. The two are never swapped.
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
70. **AC-RP-70** The footer contains no `variant="default"` button.
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
75b. **AC-RP-75b** `Renew plan`'s confirmation renders **in place**; no second dialog element
    mounts on either surface. Success fires one toast, `Plan renewed for RDR-4002`, ≤ 60
    characters, no period, no action link, and no banner for the same event (R10).
76. **AC-RP-76** The page header renders no `Churn risk` control and no record pager.
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
83. **AC-RP-83** The ledger's first-run band is the **only** illustration on either surface
    (R8).
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
98. **AC-RP-98** The sheet's focus is trapped and returns to the opener on close; the page traps
    nothing.
99. **AC-RP-99** Every spacing value is on the 4px grid (§6.3 D15) — this holds regardless of
    which deviation is in force, and **D-2 may not be cited to make anything smaller**.
100. **AC-RP-100** No motion loops. The `Open right now` dot is static and nothing on either
     surface animates for longer than 300ms.
