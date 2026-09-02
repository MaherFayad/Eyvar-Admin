# 09 — Context menus and the command centre

**Question asked:** *"is the context menu good looking, and actually useful"*

Two verdicts, because they are two different answers.

| | Verdict |
|---|---|
| **Useful** | **The architecture is right and the contents are thin.** One command declaration serving four surfaces is the correct design and it works — but it is wired into **1 of 23** tables. The other 22 declare their actions inline, and four of the five command registries are reachable only from ⌘K. Where menus exist, the most-used action for the row type is frequently absent while a permanently-dead item sits in the list. |
| **Good looking** | **No, in the one state that matters most.** The happy-path kebab is clean and correct — 181×112px, 28px items, on-token. The *refused* kebab is not: it is up to **599px wide**, its rows grow **28px → 46px**, and the refusal sentence that justifies the whole design renders at **11px / 1.97 : 1** — below every threshold, unreadable, and unreachable by keyboard. The palette is materially better looking than the kebab and does not teach itself. |

Method: read the source, then measured the running app with Playwright at 1440×900 against
`npx vite --port 5315`. Every number below is measured, not derived. Screens captured for
captains, trips, subscriptions, tickets, payouts, policy, workspace, communications, my-work,
plus RTL (`lang=ar`) and pseudo-locale (`?pseudo=1`).

> **Not reported as bugs, per instruction.** The palette is an anchored 480px popover and stays
> one (§2.6 / CQ-1) — measured at 480px, correct. A refusal renders as text, never a tooltip
> (§8.4.4 / §5.7) — correct in all three surfaces. I agree with both and my findings below are
> about *execution*, not those rulings.
>
> **The Mobbin MCP (`search_screens`) is not connected to this session** — only Figma,
> Context7, Amplitude, Hugging Face, Higgsfield and Meshy are exposed. Comparisons below use
> the 159 Mobbin-curated Shopify captures already in
> `docs/06-design-reference/shopify-admin-web/`, cited by filename. Where I reference Linear or
> Raycast I say so and I do not present it as evidence.

---

## 1. Useful — are the right actions there?

### 1.0 The finding that governs the rest

`src/commands/registry.ts`'s header states criterion **CM-1**: *"a screen declares no action
inline; it names command ids and renders what `resolveCommands` returns."*

Measured:

```
grep -rn "rowActions={" src/screens          →  23 declarations across 20 files
grep -rn "resolveCommands" src/screens       →   1 file  (CaptainsView.tsx:128-129)
```

**CM-1 holds on 1 of 23 tables.** `CaptainsView` is the only screen in the product that reads
its actions from the registry. Every other table hand-writes `label` / `onSelect` / `disabled` /
`reason` in the `.tsx`, which is the exact four-way duplication `registry.ts`'s header describes
as the defect it exists to remove.

The consequence is not stylistic. `src/commands/index.ts` documents five registries; `targets.ts`
exports five `TARGET_SOURCES`. Four of those five — trips, applicants, tickets, subscriptions —
have **no consumer on their own screen**. They are declared, tested (`domains.test.ts`, 827
lines), reachable from ⌘K, and invisible on the row they describe.

The sharpest case: **`ticket.reopen` exists, is tested, is in the palette, and is not on a ticket
row.** `TicketsScreen.tsx` declares Claim and Resolve inline; `TICKET_COMMANDS`
(`src/commands/tickets.ts:176,226,279`) declares claim, resolve **and reopen**. A support agent
looking at a resolved ticket has no way to reopen it from the queue.

### 1.1 Ten row types, what the kebab offers, what an operator wants

Wanted-column sources: the module docs in `docs/01-modules/` and the legacy console's own action
inventory, both cited.

| # | Row type | Offered today | Shape | Missing — and why it matters |
|---|---|---|---|---|
| 1 | **Captain** (`/operations/people`) | Open 360° profile · Suspend captain · Reinstate captain | kebab, 3 | **Contact captain**, **Open wallet / payout**, **View trips**, **Create ticket**. This is the product's primary record and the kebab cannot reach money or contact. `12b` §685 documents `Pay {pending}` on the driver; `13c` documents contact-drivers as a whole module. |
| 2 | **Rider** (`People ▸ Riders`) | View | **1 action → labelled button, no kebab** | `09a-riders.md:413` states the row actions verbatim: *"Row actions: `View`, `Send welcome offer`."* The offer is gone. Also missing: **Open wallet** (`09a` §94 — riders have a prepaid balance and a ledger), **Send retention offer** (`09a:339`, `:371`). A rider row in a subscription business that cannot reach the wallet is the largest single gap in the product. |
| 3 | **Trip** (`/operations/trips`) | Telemetry · Flag · Remove flag | kebab, 3 | **Create ticket from this trip**, **Send receipt**, **Edit tip**, **Open rider** / **Open captain**. `06a-all-trips.md:366-370` documents all four as live legacy actions. "Open a ticket about this trip" is the single most-used escalation path in ride ops and it is not on the row. |
| 4 | **Subscription** (`/operations/subscriptions`) | Open · Freeze · Change captain · Cancel and settle | kebab, 4 — **the largest in the product** | **Change captain is dead on every row, forever** (`SubscriptionsScreen.tsx:544` → `disabled: () => true`). Missing: **Extend**, **Refund**, **Open rider**. |
| 5 | **Ticket** (`/support/tickets`) | Claim · Resolve | 2 labelled buttons, 200px lane | **Reopen** (declared, unrendered — §1.0). **Assign to…**, **Mark in progress**, **Reply**. `13a` §11.1 documents the legacy bulk bar as Assign to me / Mark in progress / Resolve / Bulk reason code; the row has two of four and the bulk bar has none. |
| 6 | **Captain payout** (`/financials/payouts`) | Pay · View ledger | 2 buttons, 176px lane | Reasonable. Missing **Hold payout** and **Record repayment** (`12b:797` — legacy has it on every cash-debt row). |
| 7 | **Escrow hold** | Release | 1 button, 96px lane | Missing **Extend hold** / **Forfeit**. A release-only control means the only thing an operator can do to a disputed hold is give the money away. |
| 8 | **API key** (`/admin/workspace`) | Rotate · Revoke | 2 buttons | Correct set. But both share one refusal predicate (`keyActionRefusal`), so a revoked key shows **the same sentence twice**, measured at 74px wide, two lines each. |
| 9 | **Email delivery** (`/admin/communications`) | Resend | 1 button, 88px lane | Missing **View message**, **Open recipient**. On the Outbox tab **every visible row is refused with the identical sentence** — see §2.4; this is the worst-rendered surface in the product. |
| 10 | **Reason code** (`/admin/policy`) | Edit · Retire · Put back in use | kebab, 3 | Correct set, correctly ordered. Retire and Restore are mutually exclusive by construction, so **one of the three is always dead**. |
| 11 | **Work item** (`/operations/my-work`) | Open | 1 button | **Claim is in the bulk bar and not on the row** (`MyWorkScreen.tsx:362` vs `:406`). To claim one item an operator must tick its checkbox, travel to the bulk bar, click Claim, then clear the selection. Same shape on `/operations/assurance`. This is the clearest "wrong actions in the wrong surface" in the product. |

**Actions nobody would use:** one, and it is unambiguous — `subs.action.changeDriver`, disabled
on 100% of rows on 100% of loads with *"Reassigning a captain is not connected yet. Nothing would
be saved."* It is the widest item in the widest menu in the product and it is the reason that
menu is 379px (§2.2). §11.2 says do not hide an action the operator *may not* take; it does not
say render an action that **does not exist**. That is a different case and it needs its own
ruling — see §5, gap G1.

### 1.2 Ordering

`resolveCommands` preserves declaration order and the registry header says why: *"the row menu's
order is a design decision recorded in the domain registry."* That is right.

Measured order, all four kebabs:

| Table | Order | Most-used first? | Destructive last? | Separated? |
|---|---|---|---|---|
| Captains | Open · Suspend · Reinstate | yes | n/a — no destructive | **no separator anywhere** |
| Trips | Telemetry · Flag · Remove flag | yes | n/a | no |
| Subscriptions | Open · Freeze · Change captain · **Cancel and settle** | yes | **yes** | **no** |
| Reason codes | Edit · Retire · Put back in use | yes | n/a | no |

**Most-used first: yes.** The read/open action leads every menu. Correct, and it is also the
declared `rowClick` target in each, which is the P0-2 contract working.

**Destructive last: yes, once. Separated: never.**
`src/components/ui/dropdown-menu.tsx`'s own header, in capitals:

> *"§3.3/§5.4 THE DESTRUCTIVE ITEM IS LAST AND SEPARATED BY A DIVIDER … the variant survives only
> as a marker so a caller can say which item sorts last."*

Measured across every kebab in the product: **`separators = 0`**, and every item reports
`data-variant="default"`. The account menu (`p5-account.png`) has **3 separators and 2 group
labels** — so the primitive works and is used correctly one floor up. Row kebabs never use it.

**The mechanical cause is a type gap, and it is the same gap that kills the icon column.**
`Command` (registry.ts:380) declares `affordance: 'default' | 'decision-affirm' |
'decision-reject' | 'destructive'` and `icon?: LucideIcon`. `RowAction<T>`
(`components/table/rowActions.tsx`) declares `label / onSelect / disabled / reason / rowClick`.
`CaptainsView.tsx:283` maps one to the other and both fields fall on the floor. Ten commands set
an icon; `subscription.cancel` sets `affordance: 'destructive'`. **Measured `icons: 0` on every
kebab item and `data-variant: default` on every one.** The palette renders `row.icon`
(`CommandPalette.tsx:106`); the kebab cannot.

### 1.3 Does it scale?

**No nine-action kebab exists.** The distribution, measured:

```
1 action  → labelled button          my-work, riders, comms, escrow, webhooks, pricing plans
2 actions → two labelled buttons     tickets, payouts, api keys
3 actions → kebab                    captains, trips, reason codes, conversations
4 actions → kebab   ← the maximum    subscriptions
```

The 1/2-action → button shape (D8, §7.8) is a good call and it looks right. But the question is
what happens at nine, and the honest answer is: **the menu has never been designed past four, and
what happens at four already shows it will not hold.**

Two mechanisms, both measured:

1. **Width is driven by the longest refusal, not the longest label.** `DropdownMenuContent` is
   `w-max`; `RefusalLine` is `whitespace-normal`. `max-content` of wrapping text is the whole
   sentence on one line. The subscriptions menu, whose longest *label* is "Cancel and settle"
   (~110px), measures **379px** — and `line-clamp-2` never engages, because the box widened
   instead of the text wrapping (`reasonH: 16px`, one line). At `?pseudo=1` (+35%, the stand-in
   for Arabic's +4–8%) the same menu measures **599px of a 1440px viewport, off a 24px trigger.**
2. **Height is unbounded in items.** Each refused item is 46px against 28px live. Nine actions
   with, say, five refused = `4×28 + 5×46 + 8px` = **350px**, and Radix will flip and clamp it.
   `max-h-(--radix-…-available-height)` means it scrolls — a nine-item scrolling menu on a table
   row is not a design, it is a fallback.

**Verdict on scale: it does not, and nothing yet forces the issue.** The gap will open the moment
someone adds the missing actions in §1.1 — captain goes to seven, trip to seven.

### 1.4 Refusals — is it working, and is it right?

**Is it working?** Mechanically yes, visually no, by keyboard **no**.

- Gated at render, not at commit — correct, and that is the systemic legacy defect (`:10237`)
  closed. Verified across four kebabs and three button lanes.
- Rendered as text with `aria-describedby` — correct, never a tooltip.
- **Never reachable by keyboard.** Radix sets a disabled item `tabindex="-1"` and drops it from
  the roving focus group. Measured on the subscriptions kebab: opened the menu, pressed
  `ArrowDown` **six times**, focus stayed on `Open` every time — the three refused items are
  unreachable. `cmdk` does the same in the palette: `ArrowDown` from `Suspend captain` jumps
  straight past the refused `Reinstate captain`.

  **`aria-describedby` on an element that can never take focus is never announced in menu mode.**
  So the entire §11.2 apparatus — one function, one predicate, three surfaces, a translated
  sentence per refusal — is invisible to a screen-reader operator and unreachable by a keyboard
  operator. That is not a small bug; it is the rule failing at the only audience that most needed
  it.

  Fix is one line of intent: keep `aria-disabled` and drop Radix's `disabled`, then swallow the
  `onSelect`. WAI-ARIA APG's own menu pattern recommends exactly this for items that must stay
  discoverable.

**Is it right?** Yes as a rule, no as currently applied. Three sub-cases, and they are not the
same thing:

| Case | Example | Verdict |
|---|---|---|
| **(a) refused because of *this record's* state** | `Reinstate captain` on an active captain | **Correct, keep it.** The absence tells the operator nothing; the presence teaches them the state machine. This is exactly the legacy defect `registry.ts` cites (`:4113` renders Reinstate *or* Suspend and never both). |
| **(b) refused because of *the operator's* role** | *"You do not have permission to…"* on every row of a table | **Wrong at this volume.** Twenty-two rows each carrying the same sentence is one fact rendered twenty-two times. The right surface for "you cannot write on this screen" is one page-level statement, not N row-level ones. R10's logic — one event, one surface, by lifetime — is the argument, even though R10's letter is about toast-vs-banner. |
| **(c) refused because *the feature does not exist*** | `Change captain` | **Wrong, full stop.** §11.2 is about permission and state. Rendering a control for an unbuilt feature is not honesty about a constraint, it is advertising vapour to an operator who will try it once a week forever. |

Case (b) is live and measured: `/admin/communications` Outbox renders the **identical** refusal on
**every visible row** (6 of 6 measured; the source header says 22 of 22 at the time it was
written). See §2.4 for what it looks like.

The reference position, for calibration: Shopify's `Collect payment ▾`
(`02-orders/order-detail-collect-payment-dropdown.webp`) greys `Enter credit card` and gives **no
reason at all**. Eyvar's rule is better than Shopify's. It is only the execution that is worse.

---

## 2. Good looking — the rendering, measured

### 2.1 The primitive, and the happy path

`src/components/ui/dropdown-menu.tsx`, measured live:

| Property | Measured | Token | Verdict |
|---|---|---|---|
| Menu padding | `4px` | `p-1` | correct |
| Menu radius | `8px` | `rounded-lg` → `--ev-radius-control` | correct |
| Menu min-width | `160px` | `min-w-40` | correct |
| Menu ground | `#FFFFFF` | `bg-popover` | correct |
| Menu border | `1px solid rgb(240,242,244)` | `border-border` | correct |
| Menu shadow | `0 8px 24px -2px rgb(16 24 40/.12), 0 2px 6px -2px rgb(16 24 40/.06)` | `--ev-shadow-2` | correct — tier 2, resolves |
| Item height | **28px** | `py-1` + 20px line | correct, and on-grid |
| Item font | `14px / 20px` | `--text-sm` | correct |
| Item padding | `4px / 6px` | `py-1 px-1.5` | correct |
| Item gap | `6px` | `gap-1.5` | correct — but nothing occupies it |
| Item radius | `8px` | `rounded-lg` | correct |
| Icon column | **absent — `icons: 0`** | `[&_svg]:size-4` declared | **defect, §1.2** |
| Separator | **absent — `separators: 0`** | `-mx-1 my-1 h-px bg-border` exists | **defect, §1.2** |
| Destructive treatment | **absent — `data-variant="default"` on all** | variant exists as a marker | **defect, §1.2** |
| Long label | never wraps; menu widens (`w-max` + `whitespace-nowrap`) | owner ruling | **correct, and deliberate** |

**The captains kebab is genuinely good** (`kebab-captains-0.png`): 181×112px, three 28px items,
14px near-black on white, a hairline edge and a soft two-layer shadow. It is quiet, dense and
on-token. Held against `02-orders/order-detail-more-actions-menu.webp` — Shopify's six-item *More
actions* — Eyvar wins on density (28px items vs ~32) and loses on the icon column, which is the
one thing that makes Shopify's menu scannable at six items.

### 2.2 The refused kebab — the actual problem

`p2-subs-menu.png`. One live item and three ghosts, in a **379 × 176px** slab that covers five
table rows and two whole columns.

```
┌─────────────────────────────────────────────────────────────┐
│ Open                                                        │ 28px, live
│ Freeze                                                      │ 46px, 0.5 opacity
│   This subscription is cancelled or expired.                │   11px, 1.97:1
│ Change captain                                              │ 46px, dead forever
│   Reassigning a captain is not connected yet. Nothing …     │   ← this line sets the width
│ Cancel and settle                                           │ 46px
│   This subscription is already cancelled or expired.        │
└─────────────────────────────────────────────────────────────┘
   ↑ 379px, driven entirely by the longest refusal sentence
```

Four measured faults, in severity order:

1. **The refusal is illegible.** `text-muted-foreground` = `rgb(107,114,128)` — which on white is
   a perfectly good **4.83 : 1**. But `data-disabled:opacity-50` on the parent multiplies it,
   compositing to **#B5B9BF = 1.97 : 1** at **11px**. WCAG AA wants 4.5:1; the reference for
   "clearly perceptible" is 3:1. This is below both, by a lot. Disabled controls are exempt from
   1.4.3 — but that exemption assumes the disabled control carries *no information*. This one
   carries the **only** information the whole rule exists to deliver. The exemption does not
   apply to a design that put the payload inside the exempt element.

   The label above it fares little better: `rgb(23,26,33)` × 0.5 → **3.33 : 1** at 14px.

2. **The width is set by the wrong thing.** `w-max` on the content + `whitespace-normal` on the
   reason = the menu sizes to the longest *sentence*, unwrapped. 379px LTR, 412px RTL, **599px at
   `?pseudo=1`**. The `line-clamp-2` that `rowActions.tsx`'s header calls "a bound, not the fix"
   never even fires here, because the box grows instead. Its header is right and its own remedy
   does not reach this case.

3. **Item pitch is not uniform.** 28px live, 46px refused, in the same menu. The eye reads a menu
   as a column; this one has three different bar heights.

4. **Refused reads as broken, not as explained.** Three of four items greyed, in a box three
   times wider than it needs to be. The signal an operator gets in the first 200ms is "this menu
   failed to load", and only on the second read is it "here is why each of these is unavailable."

**None of this is a rule violation.** No token is broken, no arbitrary value, no physical
utility, no red. It is a composition failure: three individually-correct decisions —
`w-max` (owner ruling), `whitespace-normal` (§8.4.4), `opacity-50` (shadcn stock) — that were
never evaluated together.

### 2.3 RTL — the good news

Measured at `lang="ar" dir="rtl"` via the real Account menu switch (`p5-rtl-kebab.png`):

| | Measured | Verdict |
|---|---|---|
| Menu `direction` | `rtl` | correct — `DirectionProvider` is mounted (`App.tsx:76`) |
| `align="end"` resolution | menu.left `69` ≈ trigger.left `68.5` | **correctly mirrored** |
| Item `text-align` | `start` | correct |
| Item padding | `padding-inline-start/end: 6px/6px` | logical, symmetric |
| Chevron (submenu) | `rtl:rotate-180` declared | correct |
| Palette | `x:268 w:480 dir:rtl`, items `text-align: start` | correct |

**RTL is the best-executed part of this feature.** The kebab mirrors, the palette mirrors, the
chips mirror, the ⌘K glyph correctly does not.

One risk, not a defect. `AR = {}` (`i18n/dictionaries.ts:925`), so today's RTL render is English
text in an RTL paragraph and the trailing periods land at the visual start
(`.This subscription is cancelled or expired`). That is the bidi algorithm behaving correctly on
mixed content — but it is exactly what will happen to a *real* Arabic refusal containing a Latin
token (`DRV-0201`, `Sarah Al-Rashid`, `SUB-2003`), and refusal sentences name records constantly.
`RefusalLine` sets no `dir` and no isolation. It should wrap embedded identifiers in `<bdi>`, or
the sentences must be written to keep the identifier off the boundary. Flagging now, because it
becomes "the Arabic is broken" the day a translator delivers.

### 2.4 The labelled-button lane — worse than the kebab

`p2-direct-comms.png`. The Outbox action lane, 88px wide, every row:

```
   ┌──────────┐
   │  Resend  │   disabled
   └──────────┘
   This
   message…      ← the entire §11.2 payload, clipped to two words
```

Measured: lane 88px, button 64px, refusal `h: 32px` (two lines, clamped), text *"This message did
not fail, so there is nothing to send again."* — of which the operator sees **"This message…"**.
Six of six visible rows identical.

`rowActions.tsx`'s own header predicted this precisely and bounded it rather than fixing it:
*"at 64px of wrap width two lines is a few words, so the honest reading is that a sentence does
not belong in a lane this narrow at all."* That reading is correct. The clamp made the row height
survivable and made the sentence meaningless.

**Two further faults the clamp did not touch:**

1. **Row height is not uniform.** §3.1's Rules block: row height *"MUST be uniform within a
   table."* Measured on `/financials/payouts` — `53, 53, 53, 53, 77, 53`. The one 77px row is the
   one whose Pay is refused. On `/admin/workspace` — `73, 65, 91, 73, 77, 77`. R20 was supposed to
   make the height the table's; it has not, and the refusal line is the cause of at least the
   payouts case.
2. **A disabled button changes width.** `/support/tickets`: enabled `Claim` = **48px**; refused
   `Claim` = **112px**, because the refusal beneath it stretches the flex column. Visible in
   `p2-direct-tickets.png` — row 1's Claim is a wide pale box, rows 2–3 are narrow. The action
   lane does not form a column, which is the one thing an action lane must do.

### 2.5 Where the same sentence renders three times

One fact — *"None of the 2 selected captains is suspended."* — measured in three surfaces:

| Surface | Size | Colour | Ground | Contrast |
|---|---|---|---|---|
| Row kebab | 11px | `#B5B9BF` (muted × opacity .5) | white | **1.97 : 1** |
| ⌘K palette | 12px | `#B5B9BF` (muted × opacity .5) | white | **1.97 : 1** |
| Bulk bar | 12px | white @ 0.8 | `--ev-ink` `#171A21` | **12.8 : 1** |

The bulk bar gets it right because it is inverted and does not multiply by an opacity. It is the
proof that the sentence *can* be legible — the other two surfaces just chose an opacity that
throws it away.

It also means that with two captains selected, the identical sentence is on screen **twice at
once** — once in the palette, once in the bulk bar behind it (`ck-05-preseeded.png`). Not an R10
violation on the letter, but the same idea, and it reads as a stutter.

### 2.6 Comparison, honestly

| | Eyvar row kebab | Shopify *More actions* | Linear / Raycast (from knowledge, not evidence) |
|---|---|---|---|
| Item height | **28px** | ~32px | ~28–32px |
| Icon column | **none** | yes, consistent | yes |
| Separators | **none** | grouped | grouped |
| Shortcut hints in-menu | **none** | yes (`13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp` renders `# O`, `# D`, `# C`) | yes |
| Refusal explained | **yes** — and this is Eyvar's genuine advantage | **no** — silently greyed | no |
| Width discipline | **fails** — 379–599px | tight, ~180px | tight |

Eyvar's density is right and its honesty about refusals is ahead of the reference. It is behind
on the two things that make a menu scannable — an icon column and a divider — and it has a width
failure the reference does not have.

---

## 3. ⌘K — the walkthrough

Opened with `Ctrl+K` on `/operations/people` and tried to do real work.

### 3.1 What works, and works well

**The pre-seeded selection is the best thing in this feature.** Tick two captains, press ⌘K
(`ck-05-preseeded.png`):

```
┌ Search ─────────────────────────────────────────────────┐
│ 🔍 [2 captains ✕]  Search                          ⌘ K   │
├─────────────────────────────────────────────────────────┤
│ On this screen                                          │
│  ⊘  Suspend captain                                     │
│     2 captains                                          │
│  ▷  Reinstate captain                          disabled │
│     2 captains                                          │
│     None of the 2 selected captains is suspended.       │
│ Queues                                                  │
│  …                                                      │
└─────────────────────────────────────────────────────────┘
```

The chip is in the field. The target step is skipped. The refusal is **set-aware** — it counts
the selection and says so, which is `Command.unavailable`'s strict reading working exactly as its
doc comment promises. Icons render here. This is a well-designed surface.

**Fuzzy search is real and it earns its keep.** `csptain` (transposition) returns `Suspend
captain`, `Reinstate captain`, `Captains`, `Captain Fairness`, `Cash & Captain Debt`.
`deactivate` returns `Suspend captain` first. Legacy-name resolution works. This is materially
better than the `String.includes()` it replaced.

**Structure is right.** `Do · Destinations · Records`, reordered by query shape (CQ-2 — a leading
verb puts `Do` first, measured: `susp` → `Do (2) | Destinations (7)`). Groups carry counts. The
escape hatch `Search for "…"` is always the last row. Two-line rows with `·` metadata, never a
breadcrumb. All of §5, delivered.

### 3.2 Four defects, in severity order

**D1 — Type, then Enter, does nothing.** The fundamental palette gesture is a no-op.

```
Ctrl+K                 → selected: "Safety & Incidents"       (row 0 selected)
type "suspend"         → selected: NONE                        ← selection lost
press Enter            → groups unchanged, nothing ran          ← no-op
press ArrowDown        → selected: "Suspend captain"
press Enter            → groups: "Choose a target"              ← now it works
```

Measured twice, in separate runs. `shouldFilter={false}` is on `cmdk` (correctly — ranking belongs
to `search()`), and the consequence is that when the item list is replaced, `cmdk` does not
re-establish a selection. **Every command in the product costs one extra keypress**, and the
operator has to know that. This alone is the difference between "faster than the mouse" and "a
second route to the same place."

**D2 — It does not teach itself.** At rest the popover renders **one** block, `Queues`, with five
destinations (`ck-01-rest.png`). No `Do`. No recents. No shortcut legend. No hint that this
executes anything.

And **the field's placeholder is the word "Search."** It is a command centre labelled *Search*.
An operator who does not already know to type `suspend` will never learn that `Do` exists. The
`Do` block is the feature; it appears only after you type the thing you would only type if you
knew it was there.

`recents.ts` exists (`deriveRecentCommands`, `RECENT_COMMAND_LIMIT = 5`, persisted per operator
under `ui.paletteRecents`) and rendered nothing at rest in my session. Whether that is
cold-start or a wiring gap I could not determine from the outside — either way, the surface an
operator meets on day one is five queue links.

Shopify renders its shortcuts *inside* the menu
(`13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp`). That is the pattern.

**D3 — Records floods, and most of it cannot be acted on.** Typing `nora` — a person's name, the
single most likely query in this product — returns **19 records**, of which **12 are `PAY-####`
payout ids for the same person**, ranked above the second matching human:

```
Destinations (1)   No backup captain
Records (19)       Nora Al-Harbi          RDR-1041 · +966 51 234 5678
                   CMP-350                CMP-350 · Turki Al-Mutairi     ← unrelated
                   PAY-5510               PAY-5510 · Nora Al-Harbi
                   PAY-6120 … PAY-7106    (10 more, identical shape)
                   Noura Al-Harbi         RDR-1046 · …    ← the other human, rank 13
```

Two problems compounding. First, `search()` matches the payout's *rider name* and surfaces the
payout, so one person generates twelve rows. Second, **payouts are not in `TARGET_SOURCES`** — no
command can act on one — so twelve of nineteen rows are dead weight by construction.

`targets.ts`'s own header records the cause honestly: payouts, escrow, deductions, disputes,
safety and conversations *"are records the resolver has never heard of."* They are not command
targets and they are still search results.

Shopify's answer to the same problem is on the row: `14-global-search/search-modal-order-results-list.webp`
puts a **status badge on every result** (`Payment pending`, `Unfulfilled`, `Refunded`), so six
similar orders are six distinguishable rows. Eyvar's record rows carry `title` + `id · name` and
nothing else — `targets.ts`'s `TargetDescription` has no field for state.

Same shape on `wallet`: three rows all titled **"Driver Wallets"**, distinguished only by a raw
URL (`/financials/overview`, `/financials/payouts`, `/financials/cash`). A URL is not a
disambiguator for an operator.

**D4 — A keyword collision offers the opposite action.** `deactivate` returns:

```
Do (3)   Suspend captain      ← wanted
         Reinstate captain
         Approve              ← applicant.approve, via keyword "activate"
```

`applicants.ts:142` lists `activate` as a keyword for **Approve**; `matchScore` finds it inside
`deactivate`. So typing the word for "stop this captain" offers "approve this applicant" third in
the list. With D1 unfixed, an operator who has learnt to press ArrowDown twice out of habit is two
keystrokes from the wrong domain entirely. Substring matching on a keyword needs a word-boundary
guard.

### 3.3 Is it faster than the mouse for an operator who knows it?

**Marginally, and only for captains.** Counting keystrokes for *suspend two captains*:

| | Mouse | ⌘K today | ⌘K with D1 fixed |
|---|---|---|---|
| From a selection | 2 clicks (Suspend, confirm) | ⌘K, ↓, ↵, type reason, ↵ | ⌘K, ↵, type reason, ↵ |
| From nothing | scroll, 2 ticks, 2 clicks | ⌘K, type verb, ↓, ↵, type name, ↓, ↵, reason, ↵ | one fewer ↓, twice |

With a selection already made, the palette is roughly a wash with the bulk bar sitting right
there. Without one, the mouse wins. The palette becomes decisively faster only when it can reach
things the mouse cannot — and today it reaches **15 commands across 5 entity types**, four of
which have no row surface at all. That is the argument for §1.0: the palette's value is
proportional to how much of the product is in the registry, and 1 of 23 tables is in it.

**Does it surface the right things?** Commands: yes, all 15, and `hiddenFromPalette` is declared
exactly once with a real sentence (CM-4 holds). Navigation: yes, and legacy names resolve.
Records: yes but unranked and mostly unactionable (D3).

---

## 4. The five changes

Ordered by benefit per unit of work. 1 and 2 are the two the owner's question is really about.

### 1. Make the refusal legible, and make it reachable

*Fixes: §2.2 fault 1, §2.4, §1.4's keyboard finding. Files: `components/ui/dropdown-menu.tsx`,
`components/table/rowActions.tsx`, `components/command/CommandPalette.tsx`.*

Three edits:

- **Stop multiplying the reason by `opacity-50`.** Move the dim onto the *label* only, and let
  `RefusalLine` keep `text-muted-foreground` un-composited. `1.97 : 1 → 4.83 : 1` for free, no new
  token, no rule suspended.
- **Raise it off `--text-2xs`.** 11px is below the ramp's own floor for a sentence; `--text-xs`
  (13px) is the secondary-line step and is what the palette already uses.
- **Keep the item focusable.** Replace Radix's `disabled` with `aria-disabled` + a swallowed
  `onSelect`, so arrow keys land on it and `aria-describedby` is actually announced. This is the
  whole of §11.2 for keyboard and screen-reader operators, and today they get none of it.

### 2. Bound the menu's width, and stop putting sentences in an 88px lane

*Fixes: §2.2 fault 2, §2.4. Files: `dropdown-menu.tsx`, `rowActions.tsx`.*

- Add `max-w-72` (288px) to `DropdownMenuContent`. `w-max` still sizes to the widest *label*;
  the reason then genuinely wraps and `line-clamp-2` finally does its job. 379 → ~230px; 599 →
  288px.
- In the **labelled-button** lane, take the sentence off the row entirely. At 64–112px it cannot
  hold one and never will. Two candidates, both cheap: (a) render it once above the table when
  the same reason applies to every visible row — which is the honest shape for §1.4 case (b) and
  is what the bulk bar already does with a repeated reason; (b) let a refused button collapse to
  a kebab whose single item carries the sentence at menu width. Either fixes the non-uniform row
  height (§2.4) as a side effect.

### 3. Give ⌘K a selected first row, and a placeholder that says what it does

*Fixes: D1, D2. Files: `commands/usePalette.ts`, `shell/GlobalSearch.tsx`.*

- Set `cmdk`'s `value` to the first enabled row whenever the row list changes. Type-then-Enter is
  the gesture the whole surface is built around and it currently does nothing.
- Change the placeholder from *"Search"* to **"Search or run a command"**. Nine words of copy that
  turn a search box into a discoverable command centre.
- Render a `Do` hint block at rest — the three most recent commands if `recents` has them, or
  three exemplars if it does not — so the feature is visible before it is known.

### 4. Wire the four orphan registries into their own screens

*Fixes: §1.0, and unblocks half of §1.1. Files: `TripsScreen`, `TicketsScreen`,
`SubscriptionsScreen`, `ApplicationsView`.*

Replace the inline `rowActions` arrays with the `CaptainsView.tsx:283` map. Four screens, one
pattern already proven in production. It ships `ticket.reopen` to the ticket row, removes four
places where a label and its refusal can drift, and makes CM-1 true on 5 of 23 instead of 1.

Two things must ride along or it is not worth doing:

- **Extend `RowAction` with `icon` and `affordance`,** so the map stops dropping them, and have
  `DataTable` sort `affordance: 'destructive'` last behind a `DropdownMenuSeparator`. That is
  §3.3 delivered — the primitive and the declaration both already exist; only the wire is
  missing.
- **Carry `affordance` into `CommandConfirmRequest.destructive`.** `CaptainsView.tsx:206`
  documents this gap in its own comment and calls today's outcome *"right by luck, not by
  wiring."*

### 5. Rule on the two refusals that should not be refusals

*Fixes: §1.4 cases (b) and (c). Needs a decision, then `SubscriptionsScreen.tsx:544` and a sweep.*

- **Unbuilt features do not render.** Delete `Change captain` until there is a client behind it.
  It is the widest item in the widest menu, it is dead on every row on every load, and §11.2 was
  never about this case.
- **A role refusal is one page-level statement, not one per row.** When `canWrite` is false for
  the whole table, say so once above it and let the controls be plainly disabled. Twenty-two
  copies of one sentence is not §11.2 being honoured, it is §11.2 being applied to the wrong
  scope.

---

## 5. Gaps in `DESIGN.md` — raised, not decided

Recorded here rather than improvised. Each needs an owner's ruling.

**G1 — §11.2 does not distinguish three kinds of "cannot".** *This record's state*, *your role*,
and *this feature does not exist* are all one rule today, and they want three different surfaces
(row, page, nothing). The evidence is `subs.action.changeDriver` and the Communications Outbox.
**Recommend: a §11.2 sub-clause.**

**G2 — no rule bounds a refusal-bearing control's dimensions.** §7.3 governs label truncation and
R20 governs row height, and neither reaches a menu's `max-content` width or an 88px lane's wrap
width. `rowActions.tsx`'s header already states the problem and explicitly defers the fix to a
design owner. **Recommend: a max-width figure for a command menu, and a minimum lane width below
which a reason may not be rendered inline.**

**G3 — the disabled-control contrast exemption is being used to carry required information.**
`docs/ref/a11y.md` inherits WCAG's exemption for disabled controls. §11.2 then puts the operator's
only explanation *inside* the exempt element. Those two are in conflict and §11.2 should win.
**Recommend: an explicit floor — a refusal sentence meets 4.5 : 1 regardless of the state of the
control it describes.**

**G4 — `RefusalLine` has no bidi isolation.** Refusal sentences name records (`DRV-0201`,
`SUB-2003`, operator names), which is exactly the mixed-direction content §9 warns about, and
`docs/ref/rtl.md` does not cover a Latin identifier inside an Arabic sentence in a `line-clamp`ed
box. **Recommend: `<bdi>` around interpolated identifiers, stated as a rule so it is not
rediscovered per-string.**

---

## Appendix — evidence

Measured live at 1440×900 against `npx vite --port 5315`. Captures in the session scratchpad;
the load-bearing ones are `p2-subs-menu.png` (the 379px refused kebab), `p2-direct-comms.png`
(six identical clipped refusals), `p2-direct-tickets.png` (non-uniform lane), `ck-01-rest.png`
(⌘K at rest), `ck-05-preseeded.png` (⌘K with a selection), `p5-rtl-kebab.png`,
`p5-account.png` (the account menu, with separators).

Source read in full: `src/commands/registry.ts`, `captains.ts`, `targets.ts`, `usePalette.ts`
(headers), `src/components/table/rowActions.tsx`, `src/components/ui/dropdown-menu.tsx`,
`src/components/command/CommandPalette.tsx`, `src/shell/GlobalSearch.tsx`, plus all 23
`rowActions` declarations.

Reference: `docs/06-design-reference/shopify-admin-web/02-orders/order-detail-more-actions-menu.webp`,
`…/02-orders/order-detail-collect-payment-dropdown.webp`,
`…/13-navigation-shortcuts/quick-create-menu-with-keyboard-shortcuts.webp`,
`…/14-global-search/search-modal-order-results-list.webp`,
`…/14-global-search/search-modal-scoped-to-orders-empty.webp`.

**Test suite:** `npx vitest run --maxWorkers=4` → **3076 passed, 7 failed** (123 files, 6 failed),
636s. None of the failures are in `src/commands/` or `src/components/table/`; the observed one is
`src/screens/support/tickets/tickets.test.tsx:86` (SLA heading). Recorded because the brief said
the tree was green — it is not, though not in this feature's files.
