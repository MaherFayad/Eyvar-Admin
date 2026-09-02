# 14 — The system-wide UX plan: every page, every sheet, every popup, every form

**Status:** proposal. Second of three: `13-plane-refresh.md` owns the *visual language*, this owns the *product surface*, and `15-hierarchy-and-scannability.md` owns the *information hierarchy* — which is where the "important data doesn't stand out" problem is actually solved.
**Method:** full static scan of `src/` — 105 screen files, 100 component files, ~52,000 lines. Every claim below is a grep result with a file path, not an impression.
**Owner's brief:** *"I don't feel the whole experience is that good — make it more robust, coherent, easy to use and fun."*

---

## 0. The diagnosis, in one page

The system is **not badly built.** `DataTable` (1,527 lines) has a four-state contract with `emptyKind`, `firstRun`/`noMatch` copy, and three skeleton patterns. `IndexToolbar` puts labels on every control. `PageHeader` has a real API with exactly one primary action enforced by its type. `registry.ts` collapsed a four-way duplication of every command. The token layer is disciplined to the point of being pedantic. **That is a good foundation and none of it should be thrown away.**

What is wrong is that **the good parts are not applied evenly**, and that unevenness is what "doesn't feel good" actually is. The scan found the same product built three or four different ways depending on which week the screen was written:

| # | Defect | Measured | Effect on the operator |
|---|---|---|---|
| **C1** | **Four confirm dialogs**, and they disagree about danger | `admin/team/ConfirmDialog.tsx`, `operations/people/ConfirmDialog.tsx`, `queues/ConfirmDialog.tsx`, `financials/shared/ConfirmMoneyDialog.tsx`. Two pass `variant={destructive ? 'destructive' : 'default'}`; two hardcode `'default'` | **The same destructive action is red in Queues and not-red in People.** This is a safety defect wearing a consistency costume |
| **C2** | **Eight modal widths for ~14 modals** | `sm:max-w-md`×3, `[440px]`×3, `[420px]`×3, `xl`, `lg`, `[480px]`, `[460px]`, `3xl` | Every dialog is a different size. Nothing feels like the same product |
| **C3** | **Three paradigms for "show me one thing"** | Sheet drawers (Trip, Subscription, Conversation) · full-page routes (Applicant, Corporate, Ticket, Dashboard) · `ShellLayer` (Profile, Account, Notifications, Onboarding) | The operator cannot predict what clicking a row does |
| **C4** | **`ui/field.tsx` — 11 primitives, zero consumers** | 20 screens hand-roll `<Label>+<Input>`; auth built a parallel `AuthFieldError` | §10.4's "border **and** message, never colour alone" is enforced by nobody |
| **C5** | **`ZonesMapView.tsx` is off-system entirely** | 21 raw hex · 64 banned Tailwind palette classes · 14 arbitrary values · `dark:` variants that can never apply | 930 lines that look like a different application |
| **C6** | **Dispatch is half off-system** | `DispatchScreen` + `InterventionsCard`: 17 palette classes, `dark:` variants that can never apply, and `InterventionsCard` renders with no `useAsync` seam | A screen that cannot show that it failed |
| **C7** | **Five toast APIs, ~97 call sites** | `toast()`×30, `.success`×38, `.error`×24, `.info`×4, `.message`×1 | 30 bare `toast()` calls render iconless neutral toasts for outcomes that succeeded |
| **C8** | **Six card wrappers** | `ui/card` (38 consumers), `SectionCard` (4), `PanelCard` (5), `ChartCard` (5), `DashboardTile` (3), `MetricTile` (7) | Six header treatments, six padding rhythms |
| **C9** | **`PageShell` adopted by 28 of ~41 screens** | The other 13 hand-roll padding: `p-3`×80, `p-2`×19, `p-4`×8, `gap-1`×191, `gap-2`×137, `gap-3`×96, `gap-4`×63 | Page rhythm changes as you navigate |
| **C10** | **A fourth navigation level exists on two screens only** | `<Tabs>` inside `DispatchScreen` and `FairnessScreen`, competing with rail → sub-tab → view | Two screens navigate differently from thirty-three |

**The thesis of this document: coherence *is* the UX work.** Making one confirm dialog, one modal scale, one field shape, one detail surface and one toast vocabulary will do more for "robust, coherent, easy to use" than any new feature — and it is mostly deletion. Roughly **2,400 lines come out** across C1, C4, C7 and C8.

"Fun" is the last 10%, and it is Phase G2 (motion) plus a handful of specific moments named in Part B. Fun in an ops console is not confetti — it is **the tool answering instantly and showing you it heard you.**

---

# Part A — Global changes

These land once and every one of the 35 sub-tabs inherits them. **Do these first.** Part B is much shorter than it looks because Part A absorbs most of it.

### G1 · Brand and colour
Per `13-plane-refresh.md` Phase 1. `--primary` near-black → `#0C6944`, `--ring` and `--chart-series` blue → brand green, ship the wordmark. **Blocked on the owner's §0.4 ruling.** One day, no component touched, largest single perceived change available.

### G2 · Motion — the "fun" budget, and all of it
Per `13-plane-refresh.md` Phase 4: six duration/easing tokens, five licensed uses. R18's ambient-loop ban and the reduced-motion block at `globals.css:1238` survive. Concretely, the five moments:

1. **80ms row-hover tint** — the single highest-leverage 3 lines in this document. It is the difference between a web page and an application, on all 19 table screens at once.
2. **140ms popover scale-from-trigger** — every filter, sort, column, kebab and select in the product.
3. **200ms drawer/peek slide** from the inline edge, direction-aware.
4. **260ms bulk-bar rise** on first selection — the motion *is* the causal link between selecting and the bar existing.
5. **140ms one-shot tint flash** on a cell that just committed. This is the "it heard you" moment, and it is what makes inline editing feel good rather than uncertain.

**Explicitly not doing:** page-transition animation, staggered list entrances, skeleton shimmer on anything not actually loading, or any loop that is not the licensed live-feed dot.

### G3 · Density and readability
`--ev-row-h` 40→36, `--ev-row-h-head` →34, `--ev-control-h` 32→30. **Body stays 14px** — Plane's 12px would buy four rows and cost the §7 ledger. ~30% more rows per viewport on 19 screens, from three token values.

Table treatment (`13-plane-refresh.md` §2.6): **horizontal rules only, no vertical rules**, header row to `--muted-foreground` at 12px so it stops competing with the data.

### G4 · The four-state contract, everywhere
`DataTable` already enforces loading / empty(first-run) / empty(no-match) / error / content. **Card-based screens do not.** Promote the contract into `SectionStates` (which already exists in `profile/SectionCard.tsx:104` and is used by 4 files) and make it the only way a card renders async content. Every `*Card.tsx` in `admin/communications`, `admin/data`, `admin/policy` and `financials` adopts it.

**Rule to adopt:** a zero that is a *fact* is not an empty state. Per Plane, a group with 0 rows still renders its header and its `0`. Only an all-groups-zero table gets `EmptyState`. This kills a class of "did it break or is it just empty?" ambiguity.

### G5 · One confirm dialog *(deletes ~450 lines)*
Collapse the four into `src/components/ConfirmDialog.tsx` with a single typed request:

```ts
type ConfirmRequest = {
  title: string; body: ReactNode
  confirmLabel: string; destructive: boolean
  requireReason?: { label: string; codes?: ReasonCode[] }   // queues + team need this
  consequences?: Array<{ label: string; value: ReactNode }>  // ConfirmMoneyDialog's three-line net
  undoable?: boolean                                         // CQ-5
}
```
`ConfirmMoneyDialog`'s labelled payable/debt/**net** block is the best of the four and becomes the shared `consequences` slot — money is not the only domain that needs "here is exactly what will happen". **`destructive` drives the button variant, always, with no per-call-site override.** C1 closes structurally.

### G6 · One modal scale *(closes C2)*
Three sizes, and `DialogContent` takes a `size` prop rather than a `className`:

| size | width | for |
|---|---|---|
| `sm` | 420px | confirm, single-field, log-a-call |
| `md` | 520px | the default — most forms |
| `lg` | 720px | template editor, report save, anything with a preview |

Nothing else. `sm:max-w-3xl` and `sm:max-w-xl` both disappear. Every dialog also gets: title left, one primary + one secondary at the trailing edge in a fixed order, `Esc` closes, focus returns to the trigger, and a `140ms` enter per G2.

### G7 · One field shape *(closes C4)*
Per `13-plane-refresh.md` §6.1, option (b): promote `AuthFieldError`'s treatment (12px + glyph, written against §10.4 with a stated rationale) into `ui/field.tsx`, delete `AuthFieldError`, adopt `Field`/`FieldGroup`/`FieldError` across the 20 hand-rolled screens, and wire `useForm`'s `setFieldError` straight into it.

Plus, from the console cohort (`13-plane-refresh.md` §6.2): **two-column label/control rows for settings panes**, stacked labels in modals, copy-buttons on read-only ID fields, searchable selects above ~8 options, and a `DangerZone` section primitive.

### G8 · One detail paradigm *(closes C3)*
Adopt Plane's **peek** (`13-plane-refresh.md` Phase 3) as *the* answer to "show me one thing", with three modes — `peek` (overlay) / `side` (docked) / `full` (route) — and a per-operator persisted preference (D16).

- The three `Sheet` drawers become peek in `peek` mode. No API change for callers.
- The four full-page detail routes **keep their routes** (deep links must survive) but become peek's `full` mode, so the same component renders in all three.
- `ShellLayer` stays as-is for the four *global* surfaces (Profile, Account, Notifications, Onboarding). Those are shell, not content, and the distinction is legitimate — **document it** so the next audit does not merge them.

### G9 · One toast vocabulary *(closes C7)*
Four kinds and no bare `toast()`: `success` · `error` · `info` · `undo`. The 30 bare calls get triaged into them. Every mutation resolves to exactly one toast; a destructive action that is reversible gets the `undo` kind with a 10s handle (D18), and per CQ-5 **an undoable action does not also confirm** — that is the trade that makes the product feel fast instead of nagging.

### G10 · One card *(closes C8)*
`ui/card` (38 consumers) is the survivor. `SectionCard`, `PanelCard`, `ChartCard`, `DashboardTile` become *compositions* over it — they keep their names and APIs, but they stop re-declaring header padding, border and radius. `MetricTile` stays distinct: it is a different object with a different job.

### G11 · Bring the two outliers back on-system *(closes C5, C6)*
`ZonesMapView` (930 lines, 21 raw hex, 64 palette classes) and `DispatchScreen`/`InterventionsCard` (17 palette classes). Detail in Part B. Also strip every `dark:` variant in both — **there is no dark theme, so those are dead branches shipping as live code.**

### G12 · ⌘K can finally *do* something

> **CORRECTED 2026-09-02 — this was already built, and the finding was stale.** Verified
> in source: `GlobalSearch.tsx:85` imports `CommandPalette`, mounts it at `:334`, binds
> ⌘K at `:145–146`, and `usePalette.ts:525` calls `runCommand`. The palette also gained
> `recents.ts`, `outcomeToast.ts`, `targets.ts` and `selection.ts` — a ~3,300-line command
> layer, not the 539-line registry the original claim measured. **What produced the wrong
> claim:** it was written against a tree several weeks older, and never re-checked before
> being carried into the sequencing table.
>
> **The real remaining gap is narrower and different in kind.** `src/commands/index.ts`
> exports exactly one domain registry — `CAPTAIN_COMMANDS` — and says so in its own
> header: *"The domain registries are added one per task (P2-T2…T7); only captains exists
> in C-1."* So ⌘K executes; it simply has almost nothing to execute. **One screen of 22
> has commands.** The work is populating the registry, not wiring it, and that is a
> per-domain task rather than a one-day integration.

C-2 as originally written — "wire the registry, ship the `Do` section" — is **done**.
Superseded by: declare commands for the remaining domains. Still the single change that
most makes the product feel like a tool rather than a website.

### G13 · Navigation coherence
- **Kill the fourth level.** `DispatchScreen` and `FairnessScreen` use in-page `<Tabs>` where the other 33 use the sub-tab view switcher in `IndexToolbar`. Convert both.
- **Sub-tab counts:** the nav badges are currently the loudest colour in the shell. Per `13-plane-refresh.md`, spend them down to a neutral `--ev-nav-chip` plate; keep a warning tone only for a breached SLA row (R7).
- **Breadcrumb/`meta` slot:** `PageHeader` has one and it is under-used on the 4 detail routes, which is where "where am I" is actually in doubt.

---

# Part B — Page by page

Format per entry: **what it is** → **what's wrong** → **what changes**. Where a page's only fix is Part A, it says so and moves on — that is the point of Part A.

## B1 · Shell (mounted once, seen on every screen)

| Surface | File | Change |
|---|---|---|
| **Module rail** (80px, 5 workspaces) | `ModuleRail.tsx` | 3 raw hex → tokens. Active pill and count plate per G13. Wordmark slot takes the real `logo2.svg` (G1) — it currently draws a generic `WorkspaceGlyph` |
| **Sub-tab column** (224px) | `PageNav.tsx` | 2 raw hex → tokens. Count plates to neutral. 80ms hover per G2 |
| **Top bar** (52px) | `TopBar.tsx` | 2 raw hex → tokens. Verify the on-call name's warning tone is a token, not a literal |
| **Global search ⌘K** | `GlobalSearch.tsx` (423) | **G12 — the big one.** Wire the registry, ship the `Do` section. Keep the anchored popover; §2.6 forbids relocating it and Plane's own scoped pickers are anchored too. 140ms enter, **no row stagger** |
| **Notification bell** | `NotificationBell.tsx` | 1 palette class. Popover motion per G2 |
| **Account menu** | `AccountMenu.tsx` | Part A only |
| **Save bar** | `SaveBar.tsx` | Already correct — replaces the top bar in place, no layout shift (AC-51). **Make every form route through it** rather than shipping its own save button (G7) |
| **Shell banner** | `ShellBanner.tsx` | Part A only. The one-banner invariant (R10) is intact |
| **Shell layers** ×4 | `layers/*.tsx`, `OnboardingLayer.tsx` | Stay as `ShellLayer` per G8. Document the shell-vs-content distinction so they are not merged into peek |
| **Sign-out dirty dialog** | `SignOutDirtyDialog.tsx` | Adopt G5/G6 |

## B2 · Management (6 sub-tabs)

**`/management/overview`, `/performance`, `/risk`, `/growth`** — metric boards via `MetricBoardScreen.tsx` (429) + `MetricTile` / `ChartCard` / `MetricTileRow`.
*Wrong:* nothing structural — this is one of the healthier areas. Tiles are `Card`-based with a `Banner` and full four states.
*Changes:* Part A (G1 green series, G2 popover motion, G3 density, G10 card unification). **One addition:** per Plane's analytics, the stat row should lead with the **numeral at display size and the label small above it** — currently the tile leads with the label. That single inversion is most of what makes an analytics page read as confident.

**`/management/zones`** — `ZonesScreen.tsx` (704) + `ZonesMapView.tsx` (930).
*Wrong:* **C5, the worst offender in the product.** `ZonesMapView` has no spec reference, no rules-applied block, no `ErrorState`, no `EmptyState`, 21 raw hex (`#ef4444`, `#f59e0b`, `#10b981`, `#2563eb` — Tailwind defaults), 64 palette classes, arbitrary map-chrome fills (`bg-[#e5e3df]`, `bg-[#1a1d24]`), and `dark:` variants that can never apply. Its own header advertises "ripple effects" — an ambient loop R18 forbids.
*Changes:* **this is a rewrite of the presentation layer, not the map logic.** (a) Every status colour → the five-tone `StatusBadge` palette. (b) Map chrome fills → three new named tokens (`--ev-map-road`, `--ev-map-dark`, `--ev-map-sat`) so they are declared once and are legal. (c) Delete every `dark:` branch. (d) Add the four states — a map that cannot fail is a map that shows stale data silently. (e) Kill the ripple; selection is carried by stroke weight and the inspector card. (f) The floating inspector card becomes a **peek** (G8) so it behaves like every other detail in the product. **Budget: 2 days. It is the largest single coherence win available.**

**`/management/reports`** — `ReportsScreen` (224) → `ReportLibrary` (264) / `ReportBuilder` (482) / `ReportModePanel` (820) / `ReportModeCanvas` (624) / `DashboardsView` (303) / `DashboardDetailScreen` (334) / `AlertsView` (400), plus `SaveReportDialog` (200) and `AlertRuleDialog` (516).
*Wrong:* the most surface area of any sub-tab (~3,400 lines, 3 dialogs, 2 AlertDialogs). `AlertsView` and `DashboardsView` have **no `EmptyState`** in the scan. `QueryPanel` and `ReportModePanel` each own their own popovers and `Input` styling.
*Changes:* G4 (states on both views), G6 (`SaveReportDialog`→`md`, `AlertRuleDialog`→`lg`), G7 (both dialogs are forms and should be the first adopters of `FieldGroup`), G10 (`PanelCard`/`DashboardTile` compose over `ui/card`). **Specific fun moment:** the builder's run→result transition is the one place in the product where a 260ms cross-fade is *earned* — the operator asked a question and got an answer.

## B3 · Operations (9 sub-tabs — the heaviest workspace)

**`/operations/overview`** — metric board. Part A only.

**`/operations/my-work`** — `MyWorkScreen.tsx` (726). A *projection* over every other queue; scope rule is that any disposition is out and every action is `Open`.
*Wrong:* no `PageHeader` in the scan; relies on `StatusBadge` + `ErrorState` with no skeleton path.
*Changes:* G4 (loading state), G8 (`Open` should peek, not navigate away — this screen is *defined* by returning you to it, and peek is exactly that), G2 (row hover). **This screen benefits from peek more than any other in the product.**

**`/operations/dispatch`** — `DispatchScreen.tsx` (544) + `InterventionsCard.tsx` (138).
*Wrong:* **C6 and C10.** 17 palette classes, `dark:` variants that can never apply, and in-page `<Tabs>` as a fourth nav level. Its own header at `:43` already flags the palette classes as a known violation.
*Also, and stated accurately:* the "Dispatch Velocity" card renders **three** hardcoded figures — `42s`, `96.4%`, `78.2%` (`:486`, `:490`, `:494`). This is **already documented in-file at `:469` as unmodelled data on the remediation list**, and it carries a sound interim mitigation: the card yields to the error state when the board's reads fail, so the operator never sees a confident number beside a canvas that could not load. It is a known tracked gap, not a hidden hazard — and product-wide it is the **only** instance of the pattern.
*Changes:* (a) Model the three telemetry figures behind a client and delete the literals — this closes an open remediation item, not an emergency. (b) Palette classes → tokens; the amber/emerald pairs are already `StatusBadge` tones. (c) `<Tabs>` → the sub-tab view switcher (G13). (d) Strip `dark:`. (e) The live-feed dot is the *one* licensed ambient loop in the product (R18) and this is the screen that licenses it — keep exactly one, opacity-only, ≥0.4. (f) `InterventionsCard` renders data with **no `useAsync` seam at all** — that is the real robustness item on this screen.

**`/operations/requests`** — `RequestsScreen.tsx` (973). Two item types on one queue (instant vs subscription), different clocks, `Type` is a visible column.
*Wrong:* no loading path in the scan; the two item types are distinguished by a column, which is correct but thin.
*Changes:* G4, and **grouping (`13-plane-refresh.md` §2.7) is worth more here than anywhere** — group by type and the two clocks stop competing in one flat list.

**`/operations/subscriptions`** — `SubscriptionsScreen.tsx` (664) + `SubscriptionDetailDrawer.tsx` (289) + 3 modals: `CancelSettleModal` (239), `ChangeDriverModal` (282), `FreezeModal` (192).
*Wrong:* three modals at three different widths; drawer is a `Sheet` while sibling details are routes (C3).
*Changes:* G5/G6/G7 on all three modals, G8 on the drawer. `CancelSettleModal` gets `ConfirmDialog`'s `consequences` slot — a cancellation with a settlement is exactly the money-consequence case G5 generalises.

**`/operations/corporate`** — `CorporateScreen` (323) + `CorporateDetailScreen` (641) + `NewCorpModal` (235) + `AddEmployeeModal` (204).
*Changes:* Part A. `CorporateDetailScreen` is a card-stack form and is a **prime G7 two-column settings adopter**; it also needs a `DangerZone` for account termination. 2 palette classes in `CorporateScreen`.

**`/operations/trips`** — `TripsScreen` (767) + `TripDetailDrawer` (408) + `FlagTripModal` (189).
*Changes:* G8 (drawer→peek), G6 (modal), G2. Part A otherwise.

**`/operations/assurance`** — `AssuranceScreen.tsx` (1,239). Four views, four column sets, one table. **The widest queue in the product.**
*Wrong:* no loading path; seven item types across four views is a lot of column-set switching.
*Changes:* G4, G3 (density matters most on the widest table), and **the column-layout popover is load-bearing here** — make sure `ColumnLayoutPopover` persists per view per operator (D16), not per screen.

**`/operations/people`** — `PeopleScreen` (142) → `CaptainsView` (625) / `ApplicationsView` (624) / `ComplianceView` (560) / `RidersView` (403), + `PeopleTable` (162), `ApplicantDetailScreen` (611), `ConfirmDialog` (118).
*Wrong:* its `ConfirmDialog` is one of the four (C1) **and it hardcodes `variant="default"`** — so suspending a captain confirms with a non-destructive button while the identical pattern in Queues is red. This is the concrete instance of C1 and it is worth fixing on its own merits.
*Changes:* G5 (delete this file), G8 (`ApplicantDetailScreen` → peek `full` mode), G2. This is also the screen where `registry.ts` already landed — **it is the reference implementation for C-2**, so wire ⌘K here first.

## B4 · Financials (7 sub-tabs)

**`/financials/overview`** — `OverviewScreen` (307). Card-based, no `EmptyState`. G4 + Part A.

**`/financials/revenue`** (860), **`/payouts`** (1,379), **`/cash`** (931), **`/rider-wallets`** (590), **`/pricing`** (852), **`/ledger`** (901) — plus shared `LedgerCard` (441), `Figures` (138), `FinancialsPage` (164), `PeriodControl` (71), `entityLinks` (205), `ConfirmMoneyDialog` (277), and `PlanEditorScreen` (840).

*Wrong across the workspace:* **nothing structural — this workspace is in good shape.** An earlier draft of this document claimed five money screens had no loading path; that was a grep artefact and it was wrong. All five (`revenue:203`, `payouts:632`, `cash:599`, `wallets:499`, `pricing:244`) read through `useAsync` and forward `status={…}` into `DataTable`, which owns the skeleton. The four-state contract holds here.

*Changes:*
- G4 applies only to the **card-based** surfaces (`OverviewScreen`, `Figures`, `LedgerCard`), not the tables. `Money.tsx` should still render a skeleton-shaped placeholder rather than `0` or `—` while loading — a money field that shows a zero before its data is a misread waiting to happen even when the table around it is correct.
- `ConfirmMoneyDialog` is **promoted, not deleted** (G5): its labelled payable/debt/**net** block becomes the shared `consequences` slot and every destructive money action in the product inherits it.
- `LedgerControlsScreen` has **six views on one route** — the widest view-switcher in the product. It is the second-best case (after Assurance) for per-view persisted column layout.
- `PlanEditorScreen` (840, a full-page form on its own route) is the **single best G7 pilot**: it is already `PageShell` + `SaveBar` + `Card` + `Input`, and converting it to `FieldGroup` two-column rows will demonstrate the pattern for the other 19.
- `PricingScreen`/`RevenueScreen`/`CashScreen`: G3 density + G2 hover; these are read-heavy tables and gain the most rows-per-screen.

## B5 · Support (6 sub-tabs)

**`/support/overview`** — metric board. Part A.

**`/support/tickets`** — `TicketsScreen` (299) + `TicketDetailScreen` (603) + `LogCallModal` (202).
*Wrong:* `TicketDetailScreen` has **4 physical-direction classes** (`ml-`/`pl-`/`text-left` family) — an RTL hazard, and the highest count in the product. 4 palette classes.
*Changes:* physical → logical properties (`ms-`/`ps-`/`text-start`), G8 (detail → peek `full`), G6 (`LogCallModal` → `sm`).

**`/support/disputes`** — `DisputesScreen` (572) + `ResolveDisputeModal` (350).
*Changes:* Part A. `ResolveDisputeModal` is a 4-control form → G7 + G6 `md`.

**`/support/fairness`** — `FairnessScreen` (849). Per-row SLA targets (a rating dispute has 48h, a suspension appeal 24h).
*Wrong:* **C10** — in-page `<Tabs>`.
*Changes:* G13 (`<Tabs>` → view switcher), Part A. The per-row SLA is genuinely novel and the row should carry its target as **text plus the clock**, never the clock alone (§4.4 two-carrier rule).

**`/support/safety`** — `SafetyScreen` (843). Two clocks (acknowledge, then resolve); the only queue where lateness is not measured in money.
*Wrong:* no loading path.
*Changes:* G4, and **this screen gets the one deliberate exception to the neutral-badge rule** — a breached safety acknowledgement is exactly the "rarely, a breached row" case R7 still licenses.

**`/support/contact-centre`** — `ContactCentreScreen` (44) → `ConversationConsoleScreen` (900) + `ConversationThread` (510) + `PresenceBar` (277).
*Wrong:* no loading path on the console; the thread is a `Sheet` (C3).
*Changes:* G4, G8 (thread → peek `side` mode by default — an agent handling three concurrent chats per D22 needs the list *and* the thread, which is precisely what `side` is for). This is the second-strongest peek case after My Work.

## B6 · Admin (7 sub-tabs)

**`/admin/overview`** — Part A.

**`/admin/workspace`** — `AdminWorkspaceScreen` (678). Card + `Input` + `Select`, full four states.
*Changes:* **the flagship G7 settings conversion** — two-column label/control rows, copy-buttons on IDs, a `DangerZone`. Per the console cohort this is the pattern that makes a settings pane scannable at 15+ fields.

**`/admin/team`** — `AdminTeamScreen` (969) + `AddUserModal` (205) + `ConfirmDialog` (129) + `OperatorSessionsDialog` (217).
*Wrong:* C1 (its `ConfirmDialog` is one of the four, and this one *does* honour `destructive` — it is the better of the four). `AddUserModal.tsx:123–180` is **five consecutive copies of the same eight-line label/input block** — the clearest single illustration of C4 in the codebase.
*Changes:* G5 (this file's `destructive` handling survives into the shared component), G7 (`AddUserModal` is the second pilot after `PlanEditorScreen`), G6.

**`/admin/policy`** — `AdminPolicyScreen` (197) + `OperationalCards` (444) + `ReasonCodesCard` (735) + `SlaPolicyCards` (460).
*Wrong:* three large card files each with their own `Input`/`Switch`/`Select` layout; `ReasonCodesCard` has a `Dialog` + `DataTable` + 5 form primitives in one file.
*Changes:* G7 across all three, G4, G6. The retirement/successor flow in `ReasonCodesCard` is a genuinely good piece of design — **do not simplify it**, just re-house its form.

**`/admin/communications`** — `AdminCommunicationsScreen` (145) + 5 cards + `PushComposerModal` (232) + `TemplateEditorDialog` (352).
*Wrong:* five sibling cards (`EmailLog`, `EmailTemplates`, `MessagingTemplates`, `PushBroadcasts`, `SenderIdentities`) each independently implementing `Card` + `EmptyState` + `ErrorState` + skeleton. **This is C8 and C9 in one place.**
*Changes:* G4 via a shared `SectionStates`, G10, G6 (`TemplateEditorDialog` → `lg`, `PushComposerModal` → `md`). Estimated **~200 lines deleted** from this sub-tab alone.

**`/admin/data`** — `AdminDataScreen` (54) + `ExportCard` (253) + `IntegrityPane` (689) + `RetentionCard` (279) + `BlockedButton` (71).
*Wrong:* `ExportCard` has **no empty and no loading state** (`L:0 E:0`).
*Changes:* G4, G7. `IntegrityPane`'s "every finding names the check that produced it" rule is excellent and should be **generalised into a documented pattern** — provenance-on-every-row is exactly the kind of rule that makes a system feel trustworthy.

**`/admin/activity`** — `AdminActivityScreen` (416). `DataTable` + `PageHeader`, no loading path in scan.
*Changes:* G4, and this is the natural home for the **`ActivityFeed` primitive** the peek drawer needs (`13-plane-refresh.md` §3.3) — build it here, reuse it in every detail.

## B7 · Auth and onboarding (6 screens + 5 components)

`SignInScreen` (264), `VerifyScreen` (446), `EnrollScreen` (331), `ForgotPasswordScreen` (158), `NewPasswordCard` (393), plus `AuthCard`, `AuthFields` (352), `AuthCredentialForm`, `OtpField`, `TotpPanel`, `StrengthMeter`, `DeviceList` (394), `ReauthModal` (495).

*Wrong:* auth is the **only** area with a coherent, complete form layer — and it built it *privately* (`AuthFieldError`, `AuthFields`, `IsolatedValue`). That is the origin of C4: the best form work in the product is walled off from the other 20 screens.
*Changes:* **G7 runs in this direction** — auth's treatment is promoted into `ui/field.tsx` and auth then *consumes the shared one*. `AuthFieldError` is deleted, not preserved. `ReauthModal` (an `AlertDialog`) adopts G6 `sm`.
*Fun note:* auth is the first thing anyone sees and it is the one place a little more motion is warranted — a 200ms card cross-fade between steps (sign-in → verify → enroll) makes a 3-step flow feel like one flow. This is the **only** exception to G2's no-route-transition rule, and it is licensed because auth is not navigated 200×/day.

**Onboarding** — `OnboardingLayer` (572) + `OnboardingStepRow` (260). `ShellLayer` + `Accordion` + `Progress`, full four states. Stays as a shell layer (G8). Part A only. The progress bar is the one place a **completion moment** is worth building — per Plane, a checklist that acknowledges completion is the cheapest "fun" in any product.

---

# Part C — Sequencing

Ordered by **coherence delivered per day**, not by part number. Global work first, because Part B shrinks as Part A lands.

| # | Work | Days | Closes | Blocked on |
|---|---|---|---|---|
| 1 | **G1 brand** + **G2 motion tokens & the 5 uses** | 2 | — | owner §0.4 |
| 2 | **G12 ⌘K executes** (C-2) | 1 | — | — |
| 3 | **G5 one confirm dialog** | 1 | **C1** | — |
| 4 | **G6 one modal scale** | 0.5 | **C2** | — |
| 5 | **G9 one toast vocabulary** | 0.5 | **C7** | — |
| 6 | **G3 density + table treatment** | 1 | — | — |
| 7 | **G7 one field shape** (promote from auth, 2 pilots) | 2 | **C4** | owner picks (b) |
| 8 | **G11 Zones + Dispatch back on-system** | 3 | **C5, C6** | — |
| 9 | **G4 four states everywhere** (financials first) | 2 | — | — |
| 10 | **G10 one card** + **G9/G13 nav polish** | 1.5 | **C8, C10** | — |
| 11 | **G7 rollout** to the remaining 18 screens | 2 | — | 7 |
| 12 | **G8 peek** (My Work + Conversations first) | 3 | **C3** | 6 |
| 13 | **G4/G9 sweep** of remaining Part B items | 2 | **C9** | — |

**≈21 days.** Roughly **6 of them are net deletion.**

### The first week, specifically
Items 1–5 are **five days that touch the token layer, one shell file, and four files that get deleted.** No screen is restructured. At the end of it the product is Eyvar-green, rows respond in 80ms, ⌘K executes commands, every destructive action confirms the same way with the same red, every dialog is one of three sizes, and every outcome toasts in one of four voices.

That is the "coherent and robust" the brief asks for, and it arrives before any screen is redesigned.

### The three surfaces that sit outside the data seam
Not emergencies, but they are the genuine **robustness** items in the scan — every other screen reads through `useAsync` and forwards `status` into a component that owns the four states. These three render data with no async seam at all, which means they cannot load, fail, or be empty:

1. **`ZonesMapView.tsx`** — no seam, no `ErrorState`, no `EmptyState`. Covered by G11.
2. **`InterventionsCard.tsx`** — no seam. Covered by G11.
3. **`ExportCard.tsx`** — no seam, no empty state. Covered by G4.

Everything else checks out: the three files that call `useAsync` without forwarding `status` (`FinancialsPage`, `AdminCommunicationsScreen`, `ContactCentreScreen`) are containers whose children forward it, and the auth screens use their own form state legitimately.

### A note on the accuracy of this scan
Three claims in earlier drafts were wrong and are corrected in place:

1. **Financials was said to lack loading states.** It does not — all five screens forward `status` into `DataTable`. Grep artefact from counting the word "loading" instead of tracing the seam.
2. **The Dispatch hardcoded figures were framed as an unknown hazard.** They are already documented in-file at `:469` with a working mitigation (the card yields to the error state when reads fail).
3. **`DataTable` was said to be clean of palette classes.** It is not. `:848`, `:1215` and `:1257` carry `bg-rose-50/95`, `bg-rose-100/80`, `bg-rose-950/*` for the **critical-row highlight**, plus `dark:` variants that can never apply. The verification grep that "cleared" it used a palette list that omitted `rose`. This matters more than the other two: the critical-row highlight is the loudest signal the table has, and it is the one thing built from an off-system colour. `--ev-red-lt` already exists for exactly this. Fix tracked as **H5** in `15-hierarchy-and-scannability.md`.

### Open questions carried from `13-plane-refresh.md`
- **§0.4** — does brand green replace near-black as `--primary`? Blocks item 1, the highest-value day here.
- **§1.4** — 6° of hue between semantic "success" and brand "primary", or accept the collision?
- **§6.1** — fix `FieldError` (a), or promote `AuthFieldError` and delete the duplicate (b)? **Recommend (b)**; item 7 assumes it.
- **CQ-5** — does undoability buy a command out of its confirm step? **G9 assumes yes**, and it is the single ruling that most determines whether the product feels fast or naggy.
