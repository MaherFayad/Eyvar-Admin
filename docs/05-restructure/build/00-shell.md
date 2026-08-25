# 00.7 — The app shell

> **Phase 0, step 0.7.** Owner: frontend-engineer.
> Consumers: qa-engineer and visual-qa-engineer (0.8), every Phase 1 engineer.
>
> **Design spec:** `docs/05-restructure/design/00-shell.md` §1–§14
> **Spec:** `docs/05-restructure/specs/00-foundation.md` §4, §8.5, §10, §11
> **Upstream consumed:** `build/00-primitives.md` (0.4) · `build/00-utilities.md` (0.5) ·
> the mock layer (0.6)
> **Rulings applied in this step:** **R19** (`--ev-hairline-strong`), **R-3** (the settled
> elevation scale), **R-5** (the Arabic face), **U-4** (`<bdi>` on money), **R-1 upheld**
> (`empty` not added), **R-2 confirmed** (`--ev-marker`), **F-9 resolved** (seven Arabic
> overrides), **Q12** (the workspace-tile tone gate)

---

## 0. Status — the four gates, verbatim

```
$ npx tsc -b --noEmit
(no output, exit 0)

$ npx vitest run
 Test Files  27 passed (27)
      Tests  524 passed (524)

$ npx vite build
✓ 2055 modules transformed.
dist/index.html                                              0.38 kB │ gzip:   0.26 kB
dist/assets/noto-naskh-arabic-latin-wght-normal-….woff2      19.70 kB
dist/assets/noto-naskh-arabic-arabic-wght-normal-….woff2     94.03 kB
dist/assets/index-C1wDKCvw.css                              101.78 kB │ gzip:  16.98 kB
dist/assets/index-DeWoOZre.js                               597.13 kB │ gzip: 177.19 kB
✓ built in 3.51s
```

`/token-audit`, run against **`dist/assets/*.css`** as well as `src/`:

| Check | `src/` | `dist/` |
|---|---|---|
| Tailwind palette classes | **zero** | **zero** |
| Tailwind palette theme variables | — | **zero** |
| Arbitrary values | **zero** (three in `globals.css` prose — see §7) | **zero** |
| Raw colour outside `globals.css` | **zero** | 28 unique hex — §7 accounts for every one |
| `oklch(` | **zero** | **zero** |
| Physical-direction utilities | **zero** | **zero** |
| `@media (min-width:)` rules | — | **exactly one, at 1344px** |
| `outline-none` with no replacement | **zero** in shell code — §7 lists three inherited | — |
| `<div onClick>` | **zero** | — |
| Hover-only reveals with no `:focus-within` | **zero** | — |
| Inline `style={{}}` outside `components/ui/` | **zero** | — |
| `components.json` `"rtl": true` | yes, unchanged | — |
| `--ev-teal-lt` | absent | absent |

**Tests: 446 → 524.** The 78 new ones are `src/shell/` (89 total, of which 11 were adopted
from 0.6 — see §6.3).

**Two defects found in my own work during the audit, both the same bug as 0.4's §7.2, and
both structural now.** See §7.1. **Grep `dist`, not `src`.**

---

## 1. What was built

```
src/
  App.tsx                       providers + router. Rewritten.
  routes.tsx                    NEW — the route table, as routes. Single-owner file.
  i18n/dictionaries.ts          NEW — every operator-facing string, as keys (AC-74/75)
  shell/
    AppLayout.tsx               L-01  the frame, 3 scroll contexts, the layer root
    ModuleRail.tsx              S-01  80px rail, 5 tiles, Admin pinned, the disclosure
    PageNav.tsx                 S-02  224px column AND its popover — one component
    TopBar.tsx                  S-03  content-region only, 4 slots
    SaveBar.tsx                 S-04  replaces the top bar in place
    GlobalSearch.tsx            S-05  anchored popover, scope chip inside the input
    NotificationBell.tsx        S-06  the preview half
    AccountMenu.tsx             S-07  the single entry to my-account
    SkipToContent.tsx           S-09  first focusable element in the document
    ShellBanner.tsx             the shell strip, merged per AC-40
    ShellLayer.tsx              the drawer mechanism — no scrim, no trap
    ShellContext.tsx            session · counts · language · collapse · conditions
    routeState.ts               URL → shell state. AC-08's mechanism.
    permissions.ts              the filter. AC-57/58/61.
    navBadges.ts                AC-26/27 + the Q12 gate
    icons.tsx                   the 5 workspace glyphs + the disclosure
    layers/ProfileLayer.tsx     §6.2  ?entity=<id>
    layers/NotificationsLayer.tsx §6.3 ?notifications=all
    layers/AccountLayer.tsx     §6.4  ?account=me
    *.test.ts(x)                89 tests
  components/
    Banner.tsx                  B-01  four tones + `mergeBanners` (AC-40 as a function)
    EmptyState.tsx              B-02  two kinds, `kind` is load-bearing (R8)
    ErrorState.tsx              B-03  three scopes
    LoadingSkeleton.tsx         B-04  ten patterns + overlay, no spinner (AC-35)
    PageHeader.tsx              L-02  five slots, secondary cap of two
    PageShell.tsx               L-03/L-04/L-05/L-06 — the four page shapes
    DataTable.tsx               D-01  mode from `table.mode` (AC-48 by `tsc`)
    Money.tsx                   V-02  `<bdi>` — U-4
    StatusBadge.tsx             V-01  + `RowCriticalMarker` (V-05)
  screens/
    SubTabScreen.tsx            the generic placeholder, all four states
    RouteStates.tsx             route-not-found (AC-12), route-forbidden (AC-56)
    PlanEditorScreen.tsx        the one bleed route (AC-13)
    EntityPageScreen.tsx        the profile's full-page escape
  test/setup.ts                 + `ResizeObserver` / `matchMedia` stubs
  styles/globals.css            + R19, R-3, R-5, the two grid tokens, the scan guards
  components/ui/                checkbox, radio-group (R19); 9 files re-tiered for R-3
```

**Nothing was added to `components.json`.** It is untouched and still frozen.

---

## 2. The four carried-over items

### R19 — `--ev-hairline-strong`, and only for that

Added to `globals.css`, mapped to a `--border-strong` slot, exposed as `border-border-strong`,
and consumed by `checkbox.tsx` and `radio-group.tsx` and by nothing else.

**Value: `#8a8a85`. Computed, not eyeballed** — WCAG 2.2 relative luminance:

| Backdrop | Ratio | |
|---|---:|---|
| `--ev-surface` `#ffffff` | **3.47 : 1** | PASS — a checkbox in a card |
| `--ev-bg2` `#f8f8f5` | **3.26 : 1** | PASS — a checkbox in a hovered row |
| `--ev-bg` `#eef0f3` | **3.04 : 1** | PASS — a checkbox on the canvas |

Every surface a checkbox can sit on clears 3:1, not just white. It stays lighter than
`--ev-text-2` (5.35:1) so it cannot be mistaken for a text colour, and it keeps the ramp's
warm-neutral `r = g`, `b − 5` relationship.

**Scope is written into the token's own declaration and both component headers:** the
resting boundary of an *unchecked* checkbox or radio. Not a border, not a divider, not a
card edge, not a hover state, and **not an input border** — §4.2's input border stays
`--ev-hairline`, because an input has a fill and a label to carry it and an unchecked
checkbox has neither. The checked state keeps `border-primary`.

`radio-group.tsx` needed a third edit: its
`group-has-[:focus-visible]/field-label:not-data-checked:border-input` rule restored the old
value while a sibling label had focus, which would have dropped a focused group back to
1.15:1.

### R-5 — the Arabic face is now shipped

`@fontsource-variable/noto-naskh-arabic` (OFL-1.1), self-hosted exactly as Geist is, but
declared by hand rather than through the package's `index.css` **because that ships five
subsets and Eyvar needs two**. `math`, `symbols` and `latin-ext` are dropped — 34 kB of font
data no Eyvar string can reach, and `symbols` is emoji, which AC-76 forbids outright.

§14's two named requirements, checked:

| Requirement | Where it lives |
|---|---|
| `، ؛ ؟` (U+060C / U+061B / U+061F) | the `arabic` subset |
| Western digits U+0030–0039 | the `latin` subset |
| 400 / 600 / 700 | one variable file, `font-weight: 400 700` continuous |
| Naskh | it is Noto **Naskh** Arabic |

Verified in `dist`: `noto-naskh-arabic-arabic-…woff2` (94 kB) and
`noto-naskh-arabic-latin-…woff2` (19.7 kB) are emitted; the other three are not.

**Geist stays first in the stack in both languages.** It has no Arabic glyphs, so Arabic
characters fall through per character, while Latin text and every numeral run stay Geist —
which is what makes **AC-73** true by construction rather than by review. `system-ui` moved
from being the answer to being the last resort.

### U-4 — `<bdi>` on money

`Money` (V-02) and `MoneyCell` wrap the value in `<bdi>`. 0.5 deliberately kept U+2068/U+2069
out of the string so copy-paste, CSV export and test assertions stay clean; `<bdi>` puts the
isolation in the markup, where it belongs. `<bdi>` over `dir="ltr"` because the latter
over-claims — a money value is neutral-then-LTR, not LTR.

### R-3 — the elevation scale

The settled values are in, replacing 0.7's provisional ones. Tailwind's own `--shadow-*`
scale is **deleted** (`--shadow-*: initial`), so `shadow-sm` / `shadow-md` / `shadow-lg` /
`shadow-xl` are visible no-ops and `rgb(0 0 0 / 0.1)` cannot return from `node_modules`.
Utilities are `shadow-1|2|3` and there is no fourth.

Applied, per the tier table:

| Tier | Files changed |
|---|---|
| none | rail, sub-tab column, top bar, **save bar**, shell banner, `tabs` active pill (`shadow-sm` → `shadow-none`) |
| 1 | `card.tsx`, every card outline in `LoadingSkeleton`, the index card in `DataTable` |
| 2 | `popover`, `dropdown-menu`, `select`, `tooltip`, `chart` tooltip, `sonner`, `sheet` (was 3), the bulk-action bar |
| 3 | `dialog` only |

**The box-shadow / focus-ring trap, and my answer: elevation on the component, never a raw
`box-shadow` anywhere.** Tailwind's `shadow-*` and `ring-*` utilities compose into one
`box-shadow` declaration by construction, so a card carrying both keeps both. The rule is
enforced by having no raw `box-shadow` in the codebase at all — which is why **the two 3 px
markers are `inset-inline-start` pseudo-elements, not `box-shadow: inset 3px 0 0`**: the
active nav tile's leading bar (§2.3) and `RowCriticalMarker` (V-05, R5a use #3). That also
fixes them in Arabic, which a physical inset would not have been.

`--ev-marker` is confirmed and used for both, as a width. It is never expressed through
`--ev-shadow-*`.

---

## 3. Decisions I made, and why

### 3.1 The `wide:` variant is a custom variant, not a `--breakpoint-*` token

A `--breakpoint-wide` entry also generates Tailwind's `.container` utility **with its own
`@media (min-width:)` block** — for a class Eyvar never writes, since the capped page is
`max-w-page`. That put a second min-width rule in `dist` and broke the one-breakpoint check.
Declared as `@custom-variant wide (@media (min-width: 1344px))` instead. `--breakpoint-*:
initial` stays, so `sm:`/`md:`/`lg:` remain visible no-ops.

**1344 is still written twice** — here and as `--ev-bp-wide` on `:root`, which
`useNavCollapse` reads through `getComputedStyle`. They move together or the first-run nav
default silently disagrees with the layout. Both carry that comment.

### 3.2 The sub-tab popover is anchored by `PopoverTrigger`, not by a `virtualRef`

The disclosure lives in `ModuleRail`, and my first pass anchored the popover from `AppLayout`
through a ref. Radix then owns none of it. Rendering the `Popover` **inside** `ModuleRail`,
with the disclosure as its own `PopoverTrigger`, gets anchoring, collision detection,
`Escape`, and — the one that matters — **returning focus to the trigger on close (AC-66)**.
The popover's *content* is still passed in from `AppLayout`, so the expanded column and the
popover remain literally the same component (**AC-33**).

### 3.3 The shell layers use `Sheet`, with Radix's focus work switched off

Radix's **non-modal** dialog restores focus to its `Trigger`. The shell layers have no
trigger: they open from a URL param, set by a table cell, the bell, global search or a
notification. Radix's restore would therefore send focus nowhere.

So `onOpenAutoFocus` and `onCloseAutoFocus` are both `preventDefault()`-ed and
**`useFocusEntry` owns entry and restore** — it captures `document.activeElement` at open and
returns it on close, declining a detached opener. That is exactly the case the hook was
written for, and it composes with `sheet.tsx` rather than replacing it, so the no-scrim,
no-trap, 406 px, RTL-transform work from 0.4 is all still in force.

### 3.4 The workspace-tile roll-up is computed over **visible** rows

`navBadges.workspaceBadge` sums the sub-tabs the operator can actually see, and escalates to
`warning` only when a contributing row is `attention` **and** `count > 0`. 0.6 has since
deleted `NavCounts.workspaces` from the wire type, so the server roll-up is impossible to
consume rather than merely discouraged. The invariant holds: **any tone on a tile is
explained by a visible row with the same tone and a non-zero count.**

### 3.5 `PageNav` renders a labelled `<nav>` landmark

Two navigation landmarks in one document must be distinguishable, or a screen-reader user
hears "navigation" twice and cannot tell the rail from the column. The name is
`shell.nav.subTabsFor` — one key, one placeholder (**AC-75**).

### 3.6 `SLA_MESSAGES_EN` merges at the dictionary module

0.4's recorded decision, honoured: `src/i18n/dictionaries.ts` spreads it into `EN`, so the
provider takes one input. A dictionary assembled in two places disagrees with itself the
first time a caller forgets a merge.

### 3.7 The Arabic dictionary is empty, deliberately

`AR = {}`. Translating ~200 operator-facing strings is a content decision, not an
engineering one, and a half-Arabic console is the policy §9.3 says the rebuild exists to
retire. It is also **AC-74's own fixture**: the shell must render entirely in English
through it with no raw key, and `nav.test.tsx` asserts that under `dir="rtl"`.

Arabic *geometry* and the Arabic *face* are independent of this file — they key off
`:root:lang(ar)` and the font stack — so RTL is fully reviewable today. **Open item for
product-designer:** the Arabic strings. See §8.

---

## 4. Acceptance criteria — what the shell satisfies

Built and, where marked ✓T, covered by a test in `src/shell/`.

| AC | Status | Where |
|---|---|---|
| AC-01 five workspace targets | **pass** ✓T | `ModuleRail`, from `ROUTE_TABLE.workspaces` |
| AC-02 Admin last and pinned | **pass** ✓T | `workspace.pinnedToBottom`, a data field |
| AC-03 34 rows, unique paths | **pass** ✓T | 0.6's table; `routeState.test.ts` resolves all 34 |
| AC-04 legacy id coverage | **pass** | 0.6's `routes.test.ts` |
| AC-05 column = the workspace's sub-tabs, in order | **pass** ✓T | `PageNav` |
| AC-06 tile → that workspace's Overview | **pass** | `ModuleRail`, `${routePrefix}/overview` |
| AC-07 role-derived landing | **pass** | `routes.tsx` `LandingRedirect`, from `session.landingRoute` |
| AC-08 route-derived highlight | **pass** ✓T | `routeState.ts` — no handler sets an active state |
| AC-09 detail highlights its parent | **pass** ✓T | `resolveRoute` |
| AC-10 `?view=` changes neither column | **pass** ✓T | `resolveRoute`, `withView` |
| AC-11 Back/Forward | **pass** | `BrowserRouter` + route-derived columns |
| AC-12 not-found, shell intact, URL kept | **pass** ✓T | `NotFoundScreen`; no `<Navigate>` on `*` |
| AC-13 bleed unmounts the shell | **pass** ✓T (route level) | `routes.tsx` — a **sibling** of the layout |
| AC-14 monitor keeps the shell, no cap | **pass** | `MonitorShell` |
| AC-15 21 settings panes reachable | **pass** | 0.6's table |
| AC-16 every metric tile deep-links | **deferred** | Phase 1 wave 4 builds the tiles |
| AC-17 three regions on every route | **pass** ✓T | `AppLayout` |
| AC-18 no remount on navigation | **pass** | layout route + providers above the outlet |
| AC-19 three scroll contexts | **pass** | rail `overflow-hidden`, column `ScrollArea`, `<main>` `overflow-y-auto` |
| AC-20 layer over a live page, no scrim | **pass** ✓T | `sheet.tsx` deletes the overlay |
| AC-21 Back closes the layer | **pass** | open pushes, close replaces |
| AC-22 one layer at a time | **pass** ✓T | `withOverlay` deletes the other two |
| AC-23 toast survives a route change | **pass** | `Toaster` above the outlet |
| AC-24 page error, nav still works | **pass** | `ErrorState scope="page"` inside `<main>` |
| AC-25 selection resets | **pass** | inside `useIndexTable`'s setters (0.5) |
| AC-26 no badge at zero | **pass** ✓T | `navBadges.toBadge` |
| AC-27 tile sum, not suppressed collapsed | **pass** ✓T | `workspaceBadge` |
| AC-28 one `setInterval` | **pass** | `useTick` (0.5); the shell registers none |
| AC-29 exactly one live region | **pass** | `useAnnounce()`; no `<LiveRegion>` component exists |
| AC-30 legacy-name search | **pass** | `resolveLegacyPage` → `GlobalSearch` |
| AC-31 no h-scroll at 1280 | **needs visual-QA** | geometry is right; measurement is 0.8's |
| AC-32 first-run default | **pass** ✓T | `useNavCollapse`, viewport read once |
| AC-33 popover = same rows / **reload** | **PARTIAL — see §5** | popover ✓T; persistence fails on Q1 |
| AC-34 rail restacks below the bp | **pass** | `grid-cols-detail` above `wide:`, one column below |
| AC-35 a skeleton per pattern, no spinner | **pass** | `LoadingSkeleton`, 10 + overlay |
| AC-36 induced failure → error state | **pass** | every read is `useAsync`; `mockFailures` drives it |
| AC-37 / AC-38 the two empties | **pass** | `DataTable` branches on `table.isFiltered` |
| AC-39 no "please"/"invalid"/"failed" | **pass** | `dictionaries.ts`; grep-checkable |
| AC-40 one banner, merged with a count | **pass** ✓T | `mergeBanners` |
| AC-41 row-scoped failure | **pass** | `ErrorState scope="row"` |
| AC-42 layer not-found names the id | **pass** | `ProfileLayer`, `state.overlayNotFound.message` |
| AC-43…AC-47, AC-49, AC-50 tables | **built, unexercised** | `DataTable` supports all; Phase 1 supplies data |
| AC-48 ledger has no furniture | **pass, by `tsc`** | `table.mode === 'ledger'` narrows it away |
| AC-51 save bar, no layout shift | **pass** | one slot, one of two bars, `h-topbar` both |
| AC-52 `Save` off, `Discard` on | **pass** | `form.canSave` / `form.canDiscard`, passed through |
| AC-53…AC-55 | **deferred** | `useForm` supplies them; wave 3 wires the editor |
| AC-56 forbidden names the permission | **pass** ✓T (`forbiddenReason`) | `ForbiddenScreen` — unreachable until Q4 |
| AC-57 / AC-58 tile and row filtering | **pass** ✓T | `permissions.ts` |
| AC-59 role switch re-derives | **pass** | everything reads `session`; one render pass |
| AC-60 search hides what it cannot open | **pass** | server-side filter; the client adds none back |
| AC-61 every row has a permission | **FAILS — see §5** | Q4 |
| AC-62 skip link | **pass** ✓T | `SkipToContent` |
| AC-63 visible focus everywhere | **pass** | every interactive element rings; see §7 for three inherited |
| AC-64 tab order | **pass** ✓T | 4 tiles (one stop) → disclosure → Admin → column |
| AC-65 icon-only names | **pass** ✓T | 5 tiles, disclosure, back, bell, avatar, kebab |
| AC-66 `Escape` closes and restores | **pass** ✓T | Radix for popovers/menus; `useFocusEntry` for layers |
| AC-67 focus in, **not** trapped | **pass** | `useFocusEntry`; 0.5 asserts no listener is installed |
| AC-68 row actions keyboard-visible | **pass** | `group-hover` **and** `group-focus-within` |
| AC-69 no indefinite animation | **pass** | global guard in `globals.css` |
| AC-70 `dir` on the document element | **pass** | `applyDocumentDirection` + `DirectionBridge` |
| AC-71 nav on the inline-end side | **pass** ✓T | zero physical utilities, in source and in `dist` |
| AC-72 layers mirror, toast does not | **pass** | `sheet.tsx` `rtl:` transform; `sonner` centre-anchored |
| AC-73 numerals read identically | **pass** | Geist first + `<bdi>` + `formatMoney`'s fixed locale |
| AC-74 every string through a key | **pass** ✓T | `dictionaries.ts`, empty `AR` |
| AC-75 no concatenation | **pass** | named placeholders throughout |
| AC-76 no emoji | **pass** | `✋` and `📟` gone; grep-checkable |

---

## 5. What fails, deliberately

### AC-33 (second clause) — persistence across reload. **Q1.**

`ui.subTabNavCollapsed` and `ui.language` live in `src/lib/persistence.ts`'s in-memory store.
Collapse survives every route change (AC-32's second clause, tested) and **does not survive
reload**. I did not ship a `localStorage` adapter: that would answer Q1 by writing code.
Answering Q1 changes one file. **Owner: engineering lead** (design spec F-7).

### AC-61 — every route row has a permission. **Q4.**

All 34 rows ship `permission: null` and `session.subTabPermissions` is `{}`, so
`isSubTabVisible` currently returns `true` for everything and `ForbiddenScreen` is
unreachable. **The filter is built and tested** — `permissions.test.ts` covers denial,
read-only visibility, the tile drop and the forbidden reason by attaching a permission to a
row in the test. The day the 34 values land in `routeTable.ts`, no shell code changes.

**No role name appears anywhere in `src/shell/` or its tests.** `Trust & Safety` and
`Dispatcher` (Q3) are not assumed to exist. **Owner: business owner** (F-6).

### AC-16, AC-43–47, AC-49, AC-50, AC-53–55 — need a Phase 1 screen

`DataTable`, `PageHeader` and `useForm` support all of them; none has a real dataset yet.
Recorded as *built, unexercised*, not as passing.

### AC-31 — needs a measurement, not a claim

The geometry is right by construction (§7.4's arithmetic: 620 + 16 + 340 = 976 at 1280 px
with the column expanded). Whether anything overflows at 1280 is visual-QA's to measure.

---

## 6. For qa-engineer and visual-qa-engineer

### 6.1 Where to start

| You want to check | Read |
|---|---|
| the nav is route-derived | `src/shell/routeState.ts` — pure, call it directly |
| the permission filter | `src/shell/permissions.ts` — takes two fields, no role |
| badge rules | `src/shell/navBadges.ts` |
| all shell copy | `src/i18n/dictionaries.ts` — grep it for "please", "invalid", emoji |
| the four states of any screen | `src/screens/SubTabScreen.tsx` |

### 6.2 Inducing each state

- **Shell error (§9.1):** `mockFailures.set('session.current', …)` before render.
- **Nav counts loading:** the badges skeletonise; the labels never do.
- **Empty backlogs:** `useEmptyNavCounts()` — every tile badge disappears (AC-26).
- **Collapsed nav:** set `window.innerWidth < 1344` before first render, or click the
  disclosure. `resetDefaultUiStores()` between tests — the store is module-scoped.
- **Layers:** append `?entity=RDR-1041`, `?notifications=all`, `?account=me`.
  `?entity=NOPE-1` gives AC-42.
- **Arabic:** set `lang="ar"` and `dir="rtl"` on `<html>`; every geometry token and type
  floor moves, and the English fallback renders (AC-74).

### 6.3 The eleven adopted tests

`src/data/clients/navCounts.test.ts` imported `@/shell/navBadges` — the wrong side of the
layer boundary. Moved to `src/shell/navBadges.test.ts` **unchanged in substance**, and its
fixture imports rewritten to go **through the seam** (`getNavCounts()`, `getRouteTable()`)
rather than around it, so `seam.test.ts` stays green and the shell's own test now walks the
path the shell walks. The `count > 0` gate is the one that is easy to "simplify" away; the
mutation mock-data-engineer ran still bites.

### 6.4 Two decisions you may need from someone else before signing

1. **The 34 sub-tab subtitles are mine and provisional** (§8, item 1). If product-designer
   rewrites them, no code changes — only `dictionaries.ts`.
2. **`AR = {}`.** If you are asked to sign "renders correctly in Arabic", the geometry, the
   face, the direction and the fallback are all verifiable; the *strings* are not, because
   there are none. That is §3.7, not an oversight.

---

## 7. The audit's documented exceptions

Four categories, each deliberate. A reviewer should not re-raise them.

### 7.1 Two defects I found in my own work — both are 0.4's §7.2 recurring

**Tailwind harvests banned classes out of prose**, and it happened twice more:

1. **`nav.test.tsx` — the test that forbids physical utilities was shipping two of them.**
   Its assertion regex spelled `text-left` and `text-right`, and Tailwind minted
   `.text-left{text-align:left}` and `.text-right{text-align:right}` into `dist`.
2. **`src/lib/breakpoint.ts:5` says "the detail right-rail drop"**, and that hyphen alone
   minted `.right-rail{right:var(--ev-rail-w)}` — a **physical offset** — into `dist`.

Both fixed structurally, in `globals.css`:

```css
@source not "../**/*.test.{ts,tsx}";     /* a test is not production source */
@source not "../lib/**/*.{ts,tsx}";      /* zero `className` in either      */
@source not "../data/**/*.{ts,tsx}";     /* directory — neither renders     */
```

Narrowing the scan to the directories that actually render is correct on its own terms and
does not require editing another owner's file. `table.tsx`'s prose was also rewritten, since
it *is* production source. **The lesson stands and is now twice-proven: grep `dist`, not
`src`.**

### 7.2 Inherited `outline-hidden` on three Radix content containers

`dialog.tsx`, `alert-dialog.tsx` and `popover.tsx` set `outline-hidden` on the **content
container**, which Radix focuses programmatically on open. None is Tab-reachable, and a 2 px
ring around an entire 560 px modal is not a focus indicator anyone ships. Every *control*
inside them rings normally. **Pre-existing from 0.4; flagged rather than changed.**

`<main>` in `AppLayout` was in this category and **is fixed**: its `outline-hidden` is gone,
so the skip link's landing has visible confirmation (AC-62).

### 7.3 Three inline `style={{}}`, all in `components/ui/`

`chart.tsx` (the caller's series colour), `progress.tsx` (the SLA percentage),
`toggle-group.tsx` (the gap prop) — all genuinely dynamic, 0.4's exceptions. **0.7 added
none.** `LoadingSkeleton`'s bar widths started as inline percentages and were converted to
12-column spans, because a fixed skeleton shape is not dynamic.

### 7.4 Prose in `globals.css` naming the banned patterns

`bg-blue-500`, `bg-[#185FA5]`, `p-[13px]`, `text-[13px]` appear in comments that ban them.
`globals.css` is not in the `@source` list, and `dist` contains none of them.

### 7.5 `transition-[width]` in `progress.tsx`

0.4's one arbitrary value. It names a *property*, not a value.

---

## 8. Open items, by owner

### product-designer

1. **The 34 sub-tab subtitles are not specified anywhere** — not in the design spec, not in
   spec §3.4, not in `patterns.md`. Only two exist in prose (Live Dispatch §7.4, People
   §7.1). I derived the other 32 from §3.4's own "contributing legacy pages" column and
   marked them provisional in `dictionaries.ts`. **A subtitle is copy and copy is not mine.**
2. **The Arabic dictionary is empty** (§3.7). Whether Arabic ships as content or as a
   Phase 2 item is a product decision.
3. **The `first-run` illustration is a generic abstract stack.** §11.1 asks for ~160 px in a
   muted brand palette; mine is token-tinted and inoffensive, and every screen may override
   it. A real illustration set is a design deliverable.
4. **Copy for the overflow trigger** — I used `More actions`, per §8 slot 4b's own wording.

### product-owner

Nothing new. F-1, F-2 and F-3 are all implemented as amended: no trap on the layers, no
horizontal transform on the toast in either language, and the disclosure between the four
tiles and Admin.

### engineering lead

**Q1.** AC-33's reload clause. One file.

### business owner

**Q4.** The 34 permission values. **Q3.** `manage_settings`'s bus factor of one, and whether
`Trust & Safety` and `Dispatcher` exist.

### utilities-engineer

1. **`src/lib/breakpoint.ts:5`** — "the detail right-rail drop". The hyphen mints a physical
   utility when the file is scanned. Neutralised on my side (§7.1); worth correcting at
   source so the next person to widen the `@source` list does not reintroduce it.
2. **U-C is still open** — a `toast()` wrapper that structurally cannot pass an `action`
   (R9) and enforces ≤ 60 characters. `sonner`'s API accepts both; §11.5 forbids both. The
   shell raises no toasts yet, so nothing is broken; the first Phase 1 mutation will need it.
3. **A plural helper** may be needed by `table.showing` and the merged banner's count.
   Deliberately not built (0.5 §5); raise it when a screen actually needs one.

### mock-data-engineer

1. **The on-call rota has no client.** `TopBar`'s `On call` chip is wired to `null`, which
   renders `On call: unassigned` in warning tone — the state the chip exists for, so it is
   honest rather than broken. It needs a real read from Admin › Team & Access.
2. **Global search returns no `action` results.** §4.3.4 names three kinds of target;
   `searchDestinations` and `searchEntities` exist, actions do not. AC-60's "results the role
   cannot open must not appear" is unexercised for that third kind.
3. **`resolveProfile` covers six of the eleven entity types.** `new-rider`, `ticket` and
   `plan` have no fixture to resolve, so §4.3.1's "must extend from 6 to 11" is half done —
   `applicant` and `corporate-account` landed, the other three did not.

### Phase 1 engineers — the five things that will bite

1. **The table mode is `table.mode`.** `DataTable` reads it off the union; in the `ledger`
   branch `tsc` refuses a checkbox or a sort. Do not add a `mode` prop.
2. **`Button`'s default variant is `secondary`.** The primary must be asked for by name.
3. **`Badge` takes `tone`, and there is no red one.** Per-row criticality is
   `RowCriticalMarker` plus the countdown's own words.
4. **Report your save bar with `shell.setSaveBar({ status, canSave, canDiscard, isSaving,
   entity, … })`** — forwarding `useForm`'s flags, never re-deriving them.
5. **Declare your route in `src/routes.tsx` via the shell owner.** Every route is generated
   from `routeTable.ts`; adding a screen means pointing an existing row's element at it.
