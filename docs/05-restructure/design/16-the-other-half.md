# 16 — The other half of every user: Arabic, keyboard, and the all-day operator

**Status:** proposal. Fourth of a set. `13` owns the visual language, `14` the product surface, `15` the information hierarchy. **This one owns the users those three quietly assumed were English-reading and mouse-driven.**
**Brief:** *"enhance it drastically for **all** users, visually and experience-wise."*
**Method:** measured. Every claim carries a grep count or a file path.

---

## 0. Why this round exists

The first three rounds improved what the product looks like and how it is organised. All three implicitly audited **an English-reading operator using a mouse.** Eyvar ships to a Saudi operations team in two languages, and it is used eight hours a day by people doing the same disposition hundreds of times.

Two questions had not been asked:

1. **Does the Arabic half of the product actually exist?** Partly, no.
2. **Can the product be driven without a mouse?** Almost entirely, no.

Both are "drastic enhancement" territory, and unlike the visual work neither is a matter of taste.

---

## 0.5 Two defects found by independent review, both verified, both outranking every design item here

An independent agent audited the same tree with no access to rounds 13–16. It surfaced two things all four of my rounds missed. **I verified both against source; they are real.**

### D-A · A row click fires whatever action happens to be first — including destructive ones

`DataTable.tsx:960` chooses the row-click action by **regex-matching the translated display label**:

```ts
declaredActions.find((a) =>
  /view|open|detail|inspect|claim|show|عرض|تفاصيل|فتح/i.test(a.label)
) ?? declaredActions[0]
```

and `hasRowClickAction` is true whenever `declaredActions.length > 0`.

**The live consequence, confirmed:** `admin/communications/EmailLogCard.tsx:276–282` declares exactly one row action — `Resend` — whose `onSelect` calls `resend(delivery)` directly with **no confirm step**. `Resend` matches none of the regex alternatives, so it falls through to `declaredActions[0]`, which is itself. **Clicking anywhere on an email-log row re-sends a message to a customer.** The agent reports the same shape on API-key rotation and webhook replay in `admin/workspace/`.

Two independent faults compound here: behaviour keyed off *display copy* (so a translator can change what a click does, and any Arabic verb outside that closed set — `استعراض`, `معاينة` — silently mis-routes), and a `?? declaredActions[0]` fallback that assumes the first action is safe.

**Fix:** delete the regex and the fallback; `DataTable` takes an explicit `onRowClick` or `primaryAction` prop, and a screen with no safe primary gets no row-click at all. **This is the most serious defect in the codebase and it should be fixed before anything else in these four documents.**

### D-B · There is no keyboard path to open a record, and no error boundary

- `DataTable.tsx` has **zero** `onKeyDown` or `tabIndex` occurrences, while `:1203` is a `<TableRow onClick>` painted `cursor-pointer`. Opening a record — the most repeated interaction in the product — is mouse-only across every table screen. This sharpens §2 below: the keyboard gap is not merely "no shortcuts", it is "the primary interaction has no keyboard equivalent."
- **Zero** `ErrorBoundary` / `componentDidCatch` / `getDerivedStateFromError` anywhere in `src/`. `main.tsx` renders `<StrictMode><App/></StrictMode>` with nothing above it, so one render throw in any screen blanks the console mid-shift with no recovery but a reload.

### One finding from that review I checked and disagree with
It flagged `--chart-series` and `--chart-comparison` sharing a colour (`globals.css:977–978`) as "a two-series chart is indistinguishable". They are the same colour **on purpose** — the line beside it reads *"differs by DASH, never by hue"*, and R7 closes the palette against exactly the categorical read that a second hue would invite. Not a defect.

---

## 1. Arabic: the strings are keyed, except where they are not

> **CORRECTION, and it changes this section's headline.** An earlier draft of this document said *"entire screens render English to Arabic users"* and ranked it above every other item in rounds 13–15. That framing was wrong, and the reason is worth stating precisely.
>
> `src/i18n/dictionaries.ts:758` is `export const AR: Dictionary = {}` — **the Arabic dictionary is empty, deliberately.** The file header (`:6`–`:27`) states the decision: AC-74 requires every string to resolve through a key, *"rendering with an EMPTY Arabic dictionary shows the English fallback for every one of them"*, and *"translation of 200 operator-facing strings is a content decision, not an engineering one"*. It doubles as AC-74's own test fixture. **Arabic geometry and the Arabic typeface are explicitly independent of it and both work.**
>
> So the product is English-content-by-design today, awaiting a content pass — not silently broken. **Every** screen shows English in an Arabic session, not just the ten below.
>
> **The `defaultValue` finding survives, but as a different and smaller defect**: those 199 strings are not *keyed at all*, so when the translation pass happens they are invisible to it. Everything else in the product is one dictionary away from being Arabic; these ten files are not. That is worth fixing — and it is no longer the top priority in this document set.

### 1.1 What the scan found

**199 call sites across 10 files use `t(key, { defaultValue: 'English string' })` for keys that do not exist in any dictionary.**

| File | `defaultValue` calls |
|---|---|
| `operations/people/ApplicantDetailScreen.tsx` | **55** |
| `operations/corporate/CorporateDetailScreen.tsx` | **41** |
| `operations/dispatch/DispatchScreen.tsx` | **23** |
| `operations/corporate/CorporateScreen.tsx` | 18 |
| `operations/corporate/NewCorpModal.tsx` | 14 |
| `operations/subscriptions/ChangeDriverModal.tsx` | 13 |
| `operations/dispatch/ManualDispatchModal.tsx` | 12 |
| `operations/corporate/AddEmployeeModal.tsx` | 9 |
| `operations/dispatch/InterventionsCard.tsx` | 5 |
| `components/table/ColumnHeaderCell.tsx` | 1 |

Sampled twelve of those keys against `src/i18n/dictionaries.ts` — `action.cancel`, `action.goBack`, `action.savePolicy`, `applicant.address`, `applicant.appliedAt`, `applicant.bankDetails`, `dispatch.avgMatchTime`, `dispatch.liveTelemetry` and others. **Dictionary hits: zero, for every one.**

So: **the entire Corporate area (82 strings across four files), the whole Applicant Detail screen (55), and the Dispatch board (28) render hardcoded English to an operator working in Arabic.** These are not stray labels — `ApplicantDetailScreen` at 55 keys is essentially every string on the screen.

### 1.2 Why it happened, and why it will happen again

`src/lib/i18n/translate.ts:98`:

```ts
const template = dictionary[key] ?? fallback[key] ?? (params as any)?.defaultValue
if (template === undefined) return onMissingKey(key)
```

**`defaultValue` is checked *before* the missing-key guard.** AC-74 ships a dev-time guard that throws on a missing key — and passing `defaultValue` routes around it silently. The guard cannot fire on the exact pattern that needs it most.

The codebase already knows. `dictionaries.ts:84` and `:92` document two prior instances in these words:

> *"the two screens shipped 55 `t(key, { defaultValue })` calls and defined not one of those keys, so every string on both was untranslatable by construction."*

Those two were fixed. **The pattern was never made impossible, so it came back at 199.** This is the clearest case in the codebase of a defect that needs a *structural* fix rather than another cleanup.

### 1.3 The fix — three parts, in this order

**(a) Make the pattern impossible.** Remove `defaultValue` from the `t()` signature entirely. It has no legitimate use: a key that exists needs no default, and a key that does not exist is a bug the guard should catch. This is a one-line type change that turns 199 silent Arabic failures into 199 compile errors.

**(b) Extend `localisedKeys.test.ts` to cover `t()` call sites, not just `LocalisedText` fields.** That test already exists and already makes exactly this argument — *"the guard was written the wrong way round: `t()` throws when a key is rendered, so a key on a surface nobody has built yet is unprotected. This test moves the check from render time to build time."* It scans data-layer keys. **Point the same lexical scan at `t('…')` literals in `.tsx` and the class of defect closes permanently.**

**(c) Then translate the 199.** Corporate first (82 strings, four files, one coherent domain), then Applicant Detail (55), then Dispatch (28). This is copywriting work, not engineering, and it can run in parallel with everything else in `13`–`15`.

**Priority: high but not top.** Per the correction above, this is not "screens an Arabic operator cannot read" — it is "199 strings that the eventual translation pass cannot see." Do (a) and (b) — one day, and they are pure prevention. The 199 translations themselves wait for the same content decision every other string is waiting for.

### 1.3a The item that actually outranks everything

**`npx tsc -b` exits 1.** Two errors, both `src/commands/captains.ts:172–173` (a `Record<string, string|number>` union that admits `undefined`). `npm run build` is `tsc -b && vite build`, so **the production build does not currently pass.** Nothing else in these four documents matters until that does. Minutes to fix.

### 1.4 What is genuinely right about the i18n layer — do not touch it
- **`:root:lang(ar)` type floors** (`globals.css:827`, ramp at `:1104`+) raise the whole scale for Arabic rather than patching sites. That is the correct mechanism and it is rare to see done properly.
- **Inter first in the stack in both languages**, so numerals and Latin runs render identically in Arabic — AC-73 is true by construction, not by review.
- **The plural family resolves in one dictionary at a time** (`translate.ts:104`), preventing the bug where count 3 renders Arabic and count 100 renders English.
- **`localisedKeys.test.ts`** exists and its reasoning is correct — it just needs a wider scan.

---

## 2. The product has one keyboard shortcut

### 2.1 The measurement

Product-wide, `metaKey`/`ctrlKey` appears **twice**:
- `shell/GlobalSearch.tsx:142` — ⌘K
- `ui/sheet.tsx:136` — a focus-trap guard, not a shortcut

`<Kbd>` — the component that *displays* a shortcut — has **exactly one consumer**, the ⌘K hint in global search. Escape handlers: 3. Enter: 1.

**For a console where an operator dispositions the same queue hundreds of times a day, that is the single largest untapped experience lever in the product.** Every disposition currently costs a mouse trip.

### 2.2 What already exists to build on
- **`useRovingFocus.ts`**, consumed by `DataTable`, `ColumnHeaderCell`, `LegalityOptions` and three shadcn primitives. Arrow-key navigation within a group is already solved.
- **`commands/registry.ts`** — every action already declares an id, a label, a refusal predicate and a `run`. **A command registry is exactly the data a keyboard layer needs**, and it is already built. This is the same observation as `14`'s G12 arriving from a different direction: the registry is the missing half of two separate features.

### 2.3 The proposal — a real keyboard layer, ~3 days

**Global** (work anywhere): `⌘K` palette *(exists)* · `/` focus search · `g` then `o`/`p`/`f`/`s`/`a` jump to a workspace · `?` show the shortcut sheet.

**In a table** (the highest-value set — 19 screens inherit it at once):
`j`/`k` or `↑`/`↓` move the row cursor · `x` toggle selection · `Enter` open in peek · `e` edit the focused property chip · `Esc` close peek / clear selection.

**On a queue row:** the disposition verbs the registry already declares, bound to their first letters, honouring `unavailableReason` so a refused key explains itself rather than doing nothing.

**Three rules that make it trustworthy rather than a hazard:**
1. **Nothing destructive is a bare keypress.** Destructive verbs need the palette or a confirm, per CQ-5.
2. **Every shortcut is discoverable** — `?` opens the sheet, and `<Kbd>` hints appear in the kebab menu beside each verb. A shortcut nobody can find is dead code.
3. **A refused key says why.** The registry's `unavailableReason` (40 use sites) already carries the sentence.

**And the RTL consequence, which is not optional:** `j`/`k` are letter-keyed and direction-neutral, but any binding using `←`/`→` must mirror under `dir="rtl"`. Bind to *inline-start* / *inline-end*, never to left/right — the same discipline the CSS already follows.

---

## 3. Accessibility: healthier than expected, with two real gaps

### 3.1 The measurements

```
aria-label        127        role="alert"        36
aria-describedby   94        sr-only             21
role="status"      15        aria-live            9
<main>              9        aria-current         8
<nav>               4
```

This is a genuinely well-served product — `aria-describedby` at 94 in particular indicates form errors and helper text are properly associated, which is the thing most products get wrong. `SkipToContent` is the first focusable element and targets the `<main>` landmark (AC-62). Focus rings are never removed without replacement — `input.tsx` documents the eleven legacy `outline: none` sites it refuses to reproduce.

### 3.2 Gap one — physical direction properties
`text-left` / `ml-` / `pl-` / `border-l` and family still appear in: `TicketDetailScreen` (4 — the highest in any screen), `ui/dropdown-menu` (4), `ui/tooltip`, `ui/sheet`, `ui/select`, `ui/popover` (2 each), `metrics/BreakdownList` (2), `ReportModeCanvas`, `ReportLibrary`, `ui/textarea` (1 each).

Roughly 20 sites. Each is a place where the Arabic layout is subtly wrong — a menu that aligns to the wrong edge, a tooltip that points the wrong way. **Low effort, and it is the difference between "supports Arabic" and "works in Arabic."**

### 3.3 Gap two — motion and the reduced-motion guarantee
`globals.css:1238` clamps everything under `prefers-reduced-motion` via the universal selector, which is correct. But `13`'s Phase 4 introduces five new motion surfaces, and **`ZonesMapView`'s "ripple effects" are a JS-driven ambient loop that a stylesheet block may not reach** — `DESIGN.md:4403` names exactly this hazard for runtime-injected animation. `14`'s G11 kills the ripple; this is the accessibility reason it must actually happen rather than being deferred.

---

## 4. Role-shaped experience: already good, worth surfacing

`shell/permissions.ts` exports `visibleWorkspaces`, `visibleSubTabs`, `canWriteSubTab`, `writeRefusalPermission` and `forbiddenReason`, across **52 consuming files**, with **40 `unavailableReason` sites**. Six roles, twenty permission keys (D17). A workspace a role cannot see is not rendered; a deep link into it shows `route-forbidden` (AC-56/57).

**This is one of the strongest parts of the product and needs no rework.** One enhancement worth making: the refusal sentence is currently reactive — the operator clicks, then learns. Since `unavailableReason` is a pure predicate, the same sentence can render as a tooltip on the *disabled* control, turning a dead end into an explanation before the click. ~1 day, and it is the difference between a product that says "no" and one that says "not you, and here's who."

---

## 5. Where this sits against the other three rounds

| Round | Owns | Its biggest item |
|---|---|---|
| `13` visual language | brand, motion, density, forms, ⌘K | brand green as `--primary` — **1 day, blocked on a ruling** |
| `14` product surface | coherence: confirms, modals, toasts, detail | one confirm dialog — **closes a safety defect** |
| `15` hierarchy | emphasis tiers, KPI scale, critical row | `Column.emphasis` — **2 days, largest scannability win** |
| **`16` all users** | **Arabic, keyboard, a11y, roles** | **kill `defaultValue`** — **1 day, unblocks 199 broken strings** |

### Revised recommendation on what to do first

`14` proposed a first week of brand + motion + ⌘K + confirm + modal + toast. **That ordering should change.** Put §1.3(a)+(b) — removing `defaultValue` and widening the key test — in front of everything. It is one day of engineering, it converts a silent production defect into compile errors, and it makes the translation work (which is not engineering and can run in parallel) safe to start immediately.

Then the first week becomes:

| Day | Work | Why first |
|---|---|---|
| 1 | **Kill `defaultValue`; widen `localisedKeys.test.ts`** | Converts 199 silent Arabic failures into build errors. Unblocks translation as parallel work |
| 2 | **G1 brand** *(pending the `--primary` ruling)* | Largest perceived change per hour in the whole set |
| 3 | **G2 motion tokens + the five uses** | Makes it feel like an application |
| 4 | **G12 ⌘K executes** + **H5 critical row on-token** | Registry is built and unwired; the loudest table signal is off-system |
| 5 | **G5/G6/G9** one confirm, three modal sizes, four toasts | Closes the safety defect and two coherence defects |

**Then** `15`'s H1 (emphasis tiers, 2 days) and this document's §2.3 (keyboard layer, 3 days), which together are what make the product feel fast rather than merely tidy.

### The one-sentence version
The first three rounds make the product **look** coherent. This one makes it **usable by the people who actually use it** — and one of its findings, the 199 untranslated strings, is the only item across all four documents that is currently shipping broken.
