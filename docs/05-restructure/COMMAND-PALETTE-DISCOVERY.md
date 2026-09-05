# ⌘K, centred — a discovery for the command palette

> Owner's ask, 2026-09-05: *"a full discovery on how we can make this more like a command
> palette than this nosy input dropdown, where it opens centred in the page and is actually
> powerful and useful … cover look, feel, functionality, and other aspects."*
>
> This document is the discovery. It proposes; it does not decide. §9 lists what only the
> owner can decide. Nothing here is built.

---

## 1. What exists today, measured

The code is `src/shell/GlobalSearch.tsx` (the field and the popover), `src/commands/usePalette.ts`
(the model: steps, blocks, ranking), `src/components/command/CommandPalette.tsx` (the list) and
`src/commands/*.ts` (the registry). The behaviour, read from those files:

| Aspect | Today |
|---|---|
| Trigger | ⌘K / Ctrl K, or focusing the 400px × 28px top-bar field |
| Placement | A `PopoverContent` hung off the field, `align="start"`, 6px below it, 560px wide (`w-140`) |
| Scrim | None. The page stays fully lit behind it |
| Field | Stays in the top bar. Committed steps render as chips inside it |
| At rest (empty query) | Five blocks: *On this screen*, *Queues* (every reachable queue with its waiting count), *Resume*, *Recent commands*, *Go to* |
| With a query | *Do (n)*, *Destinations*, *Records*, ordered by query shape (CQ-2), then the escape hatch row `Search for "…"` |
| Steps | `root → target → confirm`; Backspace on an empty query ascends; Escape closes |
| Refusals | A command the operator cannot run renders disabled with its reason as text (CQ-3, §11.2) |
| Writes | Only through `command.run` (CQ-4); the outcome is a toast with Undo where the command supplies a handle |
| Registry | 13 commands across five domains: applicants 2, captains 3, subscriptions 3, tickets 3, trips 2. Two are hidden from the palette with a stated reason |
| Shortcuts | Letter shortcuts for sub-tabs (`shortcuts.ts`), not shown anywhere in the palette |
| Footer | None. No key hints, no result count |
| Row shape | Two lines always: title, then a description of what the destination is for |

Why it reads as a "nosy input dropdown", in the owner's words:

1. **It hangs off the field.** A panel anchored to an input is what every browser calls autocomplete. The eye reads it as suggestions for the text, not as a place to work.
2. **The rest state is a data dump.** Five queues with waiting counts appear before a key is pressed. Nobody asked for them, and they push the useful blocks (Resume, Recent) below the fold.
3. **Nothing is centred and nothing is dimmed.** The page behind stays live, so the panel competes with it.
4. **Two lines per row.** Fine for a destination, noise for a command or a queue. Palettes use one line with meta after the title.
5. **No hints.** No shortcut on any row, no footer saying what Enter, Tab or Escape do, no result count.
6. **Cramped at 720px.** CQ-1 itself said the anchored panel is "fine at 900px tall and cramped at 720px" and deferred the question to measurement.

The rule that made it so: `DESIGN.md` §2.6 describes Shopify's global search as an anchored popover and says in so many words *"not a centred command palette"*; the command-centre plan (`design/05-command-centre.md`, CQ-1) re-affirmed it because §2.6's reason (never relocate the thing the operator aimed at) still held. D9, the owner's own ruling, already calls ⌘K *"a command centre, not a search box"*. The centred palette is the natural end of D9, and the owner's ask overrides §2.6 and CQ-1 for this surface. §9 asks for that in writing.

---

## 2. Research — sixteen palettes on Mobbin

Every reference below was viewed as a screen or a flow on Mobbin (web platform) on 2026-09-05.

| Product | Placement | Width | At rest | Grouping | Row right slot | Footer | Nesting | Preview | Link |
|---|---|---|---|---|---|---|---|---|---|
| Vercel | centred, upper third | ~520 | *What do you need?* Projects / Teams / General / Navigation | small-caps labels | shortcut chips (`⇧P`), `Esc` in field | none | `Search Projects…` descends | no | [screen](https://mobbin.com/flows/d69bfc89-9340-4478-b035-387a87b188a9) |
| Supabase | centred | ~580 | *Run a command or search…* Shortcuts / Queries / Actions | small-caps | key hints (`⌥N`) | none | `Create…` descends | no | [screen](https://mobbin.com/screens/9b4725f5-e038-4fc7-98ad-64a59f74b4d7) |
| Jira | centred, wide | ~770 | *Search actions, settings, or type / to search work*; a context group **Issue actions [LP-5]** for the open record | labels with the record as a chip | single-letter shortcuts, chevron for nested | feedback link | `Edit status ›` | no | [flow](https://mobbin.com/flows/1767a643-b256-4ab6-bfbe-543a60fd30be) |
| Height | centred, dark | ~560 | commands for the current list | flat | shortcuts right-aligned, `Attributes… ›` | none | yes | no | [flow](https://mobbin.com/flows/229751ee-64cc-4b65-8f81-dbb162ebd8e0) |
| GitHub / VS Code | top-centred strip | ~640 | recently used | flat | shortcuts | none | `>` prefix switches to commands | no | [flow](https://mobbin.com/flows/73a63b57-cdc4-4625-812a-8c5c36682566) |
| Notion | centred, upper third | ~640 | recents grouped by day | filter row (Title only · Created by · In · + Filter) | edited time | *Open in new tab* | no | **yes**, right pane | [screen](https://mobbin.com/screens/1ad05716-44a3-48d5-9150-5780546dd323) |
| Customer.io | centred | ~600 | none shown | category chips (`Category is Goals`) | — | `Esc` `↑↓` `↵` `⌘↵` | no | **yes**, right pane | [screen](https://mobbin.com/screens/d6ebb7ec-1bb2-4406-8f94-3684981e13d0) |
| Dovetail | centred | ~580 | recents + *Explore topics* | flat | — | none | no | **yes** | [screen](https://mobbin.com/screens/d79a343f-5038-41ab-8304-1252a30f02f5) |
| Magnific | centred | ~560 | Recents / Quick actions | small-caps | shortcuts | `↑↓ Navigate · ↵ Select · Esc Close · ⇧↵ Open in new tab` | suggestion rows *Search images of "…"* | no | [screen](https://mobbin.com/screens/e22e26e2-f813-4f1e-beda-43c9ecf26419) |
| Juicebox | centred | ~520 | — | small-caps | external-link glyph | `↵ select · ↑↓ navigate · Tab jump sections · ⌘K toggle` | no | no | [screen](https://mobbin.com/screens/84169c57-5cd6-4495-bb71-93d37266f4c4) |
| Causal | centred | ~600 | Create / General / Navigation | small-caps | `↵` on the default | `↑↓ Move · ↵ Enter · Esc Clear` | breadcrumb rows `Go to Model › ASLMobbin` | no | [screen](https://mobbin.com/screens/f8956875-eefe-4d10-9499-1325950e40c2) |
| Devin, Mistral, Langdock, v0 | centred | ~540 | Actions first, then Navigation | small-caps | shortcuts | Devin: `↑↓ · Esc · ↵` | no | no | [Devin](https://mobbin.com/screens/274435b9-f420-4a7c-ab68-82514c1419f9) |
| Whop | centred | ~520 | — | scope tabs (All · Businesses · People…) with counts | *See all* | `119 results found · ↑↓ · ↵ · Esc` | no | no | [screen](https://mobbin.com/screens/8ffa040d-6149-41b5-97fc-d6fbf668bfee) |
| Frame.io, Slite | centred sheet | ~700 | full shortcut list | category sidebar | shortcuts | none | no | no | [screen](https://mobbin.com/screens/7bf0c9af-dd42-4511-a35e-15e097df461b) |
| Vanta | centred | ~480 | *Go to… ⌘+K* button in the sidebar opens it | tabs (All · Navigation · Help Center) | — | `⌘K` | no | **yes**, help article | [screen](https://mobbin.com/screens/411b3119-814c-4135-96e1-f6ff5dfaa697) |
| StackAI, Stitch | centred | ~560 | — | — | — | StackAI: `↑↓ Select · ↵ Open · ⌘↵ Open · ⌘I Copy link` | no | no | [screen](https://mobbin.com/screens/6eb2e1ee-dc4e-4ca3-81ea-55d215c48723) |

What they share, and what we take:

1. **Centred, in the upper third, over a scrim.** Sixteen of sixteen. The panel's top edge sits at roughly a sixth of the viewport and stays there while the list grows downward. Nothing anchors to a field.
2. **The input is the panel's first row**, 15–16px type, with a placeholder that names the verbs: *Run a command or search…*, *What do you need?*
3. **At rest, suggestions, not data.** Recents and quick actions for the current screen. No product lists its inventory before a key is pressed.
4. **One line per row.** Icon, title, then meta in muted ink after a separator. Right slot for a shortcut, a count or a chevron. Two lines only for records.
5. **Small-caps group labels** in muted ink. Groups render only when non-empty.
6. **A footer hint bar** in the search-heavy products, and shortcut chips on rows in the command-heavy ones. The best (Magnific, Customer.io, Juicebox) do both.
7. **Nesting is shown, not hidden.** A chevron on the row, then a breadcrumb chip in the field. Backspace on empty goes up. This is exactly our chip model.
8. **Context is a labelled group.** Jira's *Issue actions [LP-5 UI design]* is our *On this screen*, done right: the record is named in the label.
9. **A preview pane** appears only in record-heavy products (Notion, Customer.io, Dovetail, Vanta). We are record-heavy.
10. **Prefix modes** (`>` commands, `/` search) in developer tools; nowhere else. Optional for us, and quiet if adopted.

---

## 3. Look — the proposal

**Surface.** A modal dialog, not a popover. Horizontally centred; top edge fixed at `16vh` so the panel never jumps as results change; width 640px (`w-160`) at the 1280 minimum, full-width sheet from the top on the compact shell. Max height `60vh` with the list scrolling inside. `bg-popover`, `border-border`, `rounded-xl`, `shadow-3` — the same surface recipe as `DialogContent`. Scrim: the Dialog overlay we already have. Dark theme falls out of the tokens.

**Anatomy, top to bottom.**

```
┌────────────────────────────────────────────────────────────────┐
│ 🔍  [Suspend captain ✕]  nora|                          Esc    │  52px · 16px type · chips inline
├────────────────────────────────────────────────────────────────┤
│ CAPTAINS                                                       │  small-caps label, 11px, muted
│ ◉  Nora Al-Harbi · DRV-0204 · Active                      ↵    │  36px rows · one line · right slot
│ ◉  Nora Al-Qahtani · DRV-0311 · On trip                        │
│                                                                │
│ GO TO                                                          │
│ ⇢  Captains · Operations                                  G C  │  letter shortcut shown at last
├────────────────────────────────────────────────────────────────┤
│ ↑↓ move   ↵ select   Tab next group   ⌫ back        2 results  │  36px footer
└────────────────────────────────────────────────────────────────┘
```

- **Input row.** Magnifier (never mirrors, §9.5), committed steps as removable chips (the shape §5 already defines), the query at 16px, an `Esc` kbd chip at the end. The top-bar field no longer holds the query.
- **Groups.** Small-caps, `text-xs`, `text-muted-foreground`, 8px above, 4px below. Empty groups do not render (already the rule).
- **Rows.** 36px, one line: 16px icon, title in `text-sm`, meta in muted ink after ` · `. Right slot: a kbd chip for a shortcut, a count badge for a queue, a `›` for a row that descends, `↵` on the highlighted row. A refused command keeps its row, greyed, with the reason as the meta text (CQ-3 unchanged). Records are the one two-line row: name and ID on line one, status and last activity on line two.
- **Highlight.** The active row takes `bg-accent`; matched characters in the title are bold (the VS Code cue; `cmdk` exposes the match).
- **Footer.** Kbd hints on the start side, a count or the step name on the end side. In the confirm step the footer reads `↵ confirm · Esc cancel`.
- **Top bar.** The 400px field becomes a 240px trigger that looks like a field and reads *Search or run a command* with a `⌘K` chip (Vanta's *Go to… ⌘+K*). Clicking it opens the palette with the input focused, so the operator who types into "the search box" still lands in the right place.
- **Preview pane (phase 3).** For record rows only: a 280px pane on the end side with the 360° header (name, ID, status badge, last activity) and the three most likely commands as buttons. Shown only when the panel can be 880px wide, which at 1280 it can.

**What the rest state looks like.** No queues. Three groups, ten rows at most:

```
ON THIS SCREEN · Requests            (≤3: commands for the selection or the open profile, then the route)
RESUME                               (≤3 last destinations)
RECENT COMMANDS                      (≤3)
GO TO                                (the five workspaces, each with its letter shortcut)
```

The queue counts move to where they are asked for: type `queue`, a queue's name or `waiting`, and the *Queues* group appears with its counts.

---

## 4. Feel

- **Opening.** ⌘K (Ctrl K on Windows; the chip shows the right glyph for the platform), the top-bar trigger, or `/` when focus is not in a field (Jira's habit; cheap, and D9's "command centre" deserves a one-key door). Overlay fades in 150ms, panel scales 95→100 over 150ms; 100ms out. Both are licensed durations (`docs/ref/motion.md`); no `transition-all`; `motion-reduce` drops the scale.
- **Focus.** The input takes focus on open. The dialog traps focus (a dialog does, a popover does not; §7.3.3 stops applying, the Dialog rules start). Closing returns focus to the element that opened it. Handing off to a layer follows D-11a: the layer wins.
- **Typing.** Local ranking is synchronous. Record lookups debounce at 150ms and show a one-row *Looking up…* inside their own group, never a spinner over the list. Stale responses are dropped. The panel's top edge never moves; height grows downward to `60vh` then scrolls.
- **Keys.** `↑↓` move across groups; `Tab` and `⇧Tab` jump to the next and previous group (Juicebox); `↵` runs or descends; `→` on a record row opens its actions in place; `⌫` on an empty query ascends one step; `Esc` ascends when a chip is present and closes at root (Vercel, Linear). `⌘↵` on a destination opens it and keeps the palette open, for the operator working through a list.
- **Selection carries.** Rows selected on the screen pre-seed the target (already specified in the command-centre plan §3); the chip reads `[2 captains]`.
- **Outcome.** The palette closes on a successful run; the toast carries the object name and Undo (R9, existing `outcomeToast`). A refused run never closes the palette; the reason is on the row.
- **Quiet.** No sounds, no confetti, no badges inside the palette. One highlight, one accent.

---

## 5. Functionality — what makes it powerful

The three verbs exist: **Go** (destinations), **Find** (records), **Do** (commands). The palette is only as powerful as what those three can reach and how few keystrokes each costs. In order of value per effort:

| # | Capability | Why it matters | Cost | Depends on |
|---|---|---|---|---|
| F1 | **Rest state as context**, not inventory (§3 above). | The first thing every operator sees, dozens of times a day. | Small: reorder and cap blocks in `usePalette.ts`, drop the *Queues* block at rest. | — |
| F2 | **Record actions in place.** `→` or `↵` on a record row shows that record's commands (from the domain registry, `scope.kind === 'entity'`) as a nested group, labelled with the record: *Nora Al-Harbi · DRV-0204*. | Turns Find into Do without opening a profile. Jira's *Issue actions*, Height's *Attributes ›*. | Medium: a `record` step between `root` and `target`; the registry already scopes by entity. | registry coverage (F6) |
| F3 | **Arguments in one line.** `suspend nora` ranks *Suspend captain* first and, on `↵`, descends with `nora` already typed as the target query. | The fastest path from intent to done. | Small: when a Do row wins and the query has tokens left after the matched keyword, carry them into the target step. | — |
| F4 | **Shortcuts, shown.** Letter shortcuts for sub-tabs already exist (`shortcuts.ts`); render them on *Go to* rows. Give the five most-used commands a two-key chord (`G C` go to captains, `S C` suspend captain) shown on the row. A *Show keyboard shortcuts* command opens a sheet (Frame.io, Slite). | Shortcuts nobody can see are shortcuts nobody uses. | Small for display; medium for chords. | — |
| F5 | **Ranking that learns.** Recency and frequency per operator, from the existing `recents.ts` log, weighted into `scoreCommand`. | The second time is faster than the first. | Small, once persistence is decided (CQ-6). | Q1 / CQ-6 |
| F6 | **Registry growth to ~40 commands.** Today 13. Add: wallets (adjust, goodwill credit), dispatch (assign request, expire), safety (close incident), cash (decide report), complaints and disputes (resolve), fairness (decide case), team (invite, change role, revoke), pricing (publish plan), session (switch language, switch theme, sign out). Every command with English and Arabic keywords. | The `Do` verb is thin at 13. | Medium, spread across domains; each is a registry entry that also fixes the four-way action duplication D9 exists for. | domain specs |
| F7 | **Prefix modes, quiet.** `>` commands only, `#` IDs, `@` people, `/` destinations. Typing the prefix shows a scope chip; the rest-state footer hints them once. | Power users; zero cost to everyone else. | Small: a scope chip is already a concept. | — |
| F8 | **Preview pane for records.** 360° header plus three commands, on the end side. | Confirms *which* Nora before acting; saves an open-and-back. | Medium; needs the 360° summary endpoint the profile layer already uses. | F2 |
| F9 | **Escape hatch stays last.** `Search for "…" in Captains` while a query is present, at root only. | §5's rule; nothing here removes it. | — | — |
| F10 | **Bulk from the palette.** With rows selected, `⌘K → suspend → ↵` acts on the selection and skips the target step. | Already in the command-centre plan; the centred surface makes it visible. | Exists in the model. | — |

Out of scope, on purpose: natural-language "ask AI" rows (Causal, Magnific). The console has no help centre or model behind it yet (Q-O2 is still open), and a row that answers nothing is worse than no row.

---

## 6. Other aspects

**Accessibility.** `role="dialog"`, `aria-modal`, labelled by the input's label. `cmdk` supplies listbox and option semantics. A visually hidden live region announces the result count on change (*6 results*). Every row is a real option; refusals are real text, not a tooltip (§11.2, §5.7). Focus is visible on rows and on the Esc chip. `motion-reduce` disables the scale.

**Arabic and RTL.** The panel mirrors with `dir`; the magnifier does not (§9.5). Kbd chips keep Latin glyphs and sit at inline-end. Group labels and meta separators use the Arabic dictionary. Keywords in the registry carry Arabic terms so *أوقف* finds *Suspend captain*. Record IDs stay LTR inside bidi isolation (existing `displayString`).

**Four states.** Content, empty (*Nothing matches "x". Try an ID like DRV-0204, or a command like suspend*), loading (one row per async group), error (one row with *Retry*, the existing `listStatus` and `retry`). The panel is never blank and never a spinner.

**Copy.** Every string keyed in `src/commands/copy.ts` with Arabic under `src/i18n/ar/`. New keys: the placeholder (*Type a command, a name or an ID*), the trigger label (*Search or run a command*), footer hints (*move*, *select*, *next group*, *back*, *confirm*, *cancel*), the empty sentence, the prefix hints, the record-actions label. Sentences take a full stop, labels do not (R6).

**Motion.** 150ms in, 100ms out, opacity and scale only. No duration tokens (D-13). `motion.licence.test.ts` guards it.

**Performance.** Ranking is synchronous over ≤ 60 commands and ≤ 40 destinations. Records are the only async work; cap 8 per group with an *n more* row that descends into the escape hatch. Cancel stale lookups by query token.

**Telemetry.** `palette.opened` (source: shortcut / trigger / slash), `palette.ran` (command id, step depth, keystrokes, ms open), `palette.abandoned` (query length, step). The existing in-memory `track` seam takes them; the ranking in F5 reads them.

**Testing.** Vitest for behaviour: open by each door, focus in the input, `↑↓ Tab ↵ ⌫ Esc` semantics, rest-state cap of ten rows, refusal rows present and disabled, argument carry (F3), record actions (F2). Playwright harness for what jsdom cannot see: centred within 1px at 1280×720 and 1280×900, top edge at 16vh, width 640, no vertical jump between rest and a 40-row result, Arabic mirror, dark theme, focus return. One test per acceptance criterion.

**Rulings this touches.**

| Rule | Today | Proposed |
|---|---|---|
| §2.6 anchored popover, *"not a centred command palette"* | binding | **Owner override** for the palette only, recorded under *Standing owner overrides* in `docs/RULINGS.md` |
| CQ-1 stay anchored | binding | superseded by the override |
| CQ-2 order by query shape, CQ-3 refusals in place, CQ-4 writes only via `command.run` | binding | unchanged |
| R4-3 the shell has four layers; re-authentication is a modal | binding | the palette is a **modal like re-authentication**, not a fifth layer; it never writes the URL, so AC-22 (one layer at a time) is untouched |
| §7.3.3 a popover does not trap focus | applied | no longer applies; Dialog focus rules do |
| D-11a the layer wins focus on hand-off | binding | unchanged; the palette hands off exactly as a menu does |
| §5 escape hatch last, scope chip in the field | binding | unchanged |
| D-13 no duration tokens | binding | unchanged |

**Risks.**

- `cmdk` inside a Radix `Dialog`: the two both manage focus and key events. Known to work (shadcn's `CommandDialog` is exactly this), but the confirm step's textarea must take focus without `cmdk` stealing `↵`.
- The Shopify structural reference is deliberately departed from on this one surface. Record it so the next auditor does not "fix" it back.
- The chips inside a 640px input: three chips plus a query fit; four do not. Cap the chain at three steps (command, target, confirm), which is the model today.
- Muscle memory: operators who type into the top-bar field. The trigger opens the palette with focus in the input on the same keystroke, so the habit still works.

---

## 7. Phasing

| Phase | Deliverable | Size |
|---|---|---|
| **P1 — the surface** | Centred dialog, scrim, fixed top edge, 640px, footer hints, one-line rows, small-caps groups, rest state trimmed to three groups plus *Go to*, queues on demand, top-bar trigger, `Esc`/`⌫` semantics, harness for placement and no-jump. The RULINGS override. | 2–3 days |
| **P2 — the power** | F2 record actions in place, F3 argument carry, F4 shortcuts shown, F5 ranking by recency, F7 prefix modes, F6 registry to ~40 across the domains. | 5–8 days, F6 spread over the domain owners |
| **P3 — the depth** | F8 preview pane, the shortcut sheet, telemetry-informed suggestions at rest. | 3–4 days |

P1 alone answers the ask in the screenshot. P2 is what makes it *"actually powerful"*. P3 is what the record-heavy references do that the others do not.

---

## 8. Acceptance criteria, first draft

- **AC-CP1** ⌘K, Ctrl K, `/` outside a field, and the top-bar trigger each open the palette with focus in its input.
- **AC-CP2** The panel is horizontally centred within 1px, its top edge at 16vh, 640px wide, at 1280×720 and 1280×900; the top edge does not move between the rest state and a 40-row result.
- **AC-CP3** At rest the list holds at most ten rows in at most four groups, and no group is *Queues*.
- **AC-CP4** Typing `queue` or a queue's name shows the *Queues* group with waiting counts.
- **AC-CP5** `↑↓` cross group boundaries; `Tab` moves to the next group; `⌫` on an empty query ascends; `Esc` ascends with a chip present and closes at root.
- **AC-CP6** `suspend nora` ranks *Suspend captain* first and `↵` opens the target step with `nora` as the query.
- **AC-CP7** `→` on a record row shows that record's commands under a label naming the record; a refused command is present, disabled, with its reason.
- **AC-CP8** Every *Go to* row shows its letter shortcut; the footer shows hints for the current step.
- **AC-CP9** The Arabic build mirrors the panel and keeps the magnifier and kbd glyphs unmirrored.
- **AC-CP10** Closing returns focus to the opener; opening a layer from a row hands focus to the layer.

---

## 9. Decisions only the owner can make

| # | Question | Recommendation |
|---|---|---|
| **Q-P1** | Override §2.6 and CQ-1: the palette becomes a centred modal. | Yes. The ask says so; record it in RULINGS. |
| **Q-P2** | The top-bar field: keep as a trigger, or remove and rely on ⌘K. | Keep as a 240px trigger reading *Search or run a command ⌘K*. Discoverability for new operators; the onboarding welcome already teaches ⌘K. |
| **Q-P3** | `Esc` with a chip present: ascend one step, or close. | Ascend. Backspace does the same; closing throws away a half-built command. |
| **Q-P4** | Prefix modes (`>` `#` `@` `/`). | Yes, quiet: no UI beyond a chip when typed and one footer hint at rest. |
| **Q-P5** | Persistence for recents and ranking (CQ-6 / Q1). | Use the UI store that already persists theme and language, per operator, on this machine. Server-side later if it matters. |
| **Q-P6** | Preview pane. | Phase 3, records only, 880px panel when shown. Decide after P2 is in hands. |
| **Q-P7** | Which domains grow the registry first. | Dispatch and wallets: the most-repeated actions in My Work today. |
| **Q-P8** | `/` as a door. | Yes, when focus is not in a field. Jira's habit; one key. |

---

## 10. Files this would touch

`src/shell/GlobalSearch.tsx` (becomes the trigger plus a `CommandDialog`), `src/components/command/CommandPalette.tsx` (rows, groups, footer), `src/commands/usePalette.ts` (rest-state diet, argument carry, record step, prefixes, ranking), `src/commands/copy.ts` and `src/i18n/ar/commands.ts` (new keys), `src/commands/<domain>.ts` (F6), `docs/RULINGS.md` (the override), `docs/05-restructure/design/05-command-centre.md` (CQ-1 superseded, §3 gains the record step), `scripts/harness/palette.mjs` (new), `src/commands/palette.test.tsx` (extended).

---

## 11. F6 status — the registry, as built

**43 commands in 15 registries**, up from 13 in 5. Every id below is declared in
`src/commands/<domain>.ts` and asserted by `src/commands/domains.test.ts`.

| Domain | File | Command ids | Arity | Affordance |
|---|---|---|---|---|
| Captains | `captains.ts` | `captain.openProfile` · `captain.suspend` · `captain.reinstate` | target / input / target | default |
| Trips | `trips.ts` | `trip.flag` · `trip.unflag` | input / target | default |
| Applications | `applicants.ts` | `applicant.approve` · `applicant.reject` | target / input | default |
| Tickets | `tickets.ts` | `ticket.claim` · `ticket.resolve` · `ticket.reopen` | target | default |
| Subscriptions | `subscriptions.ts` | `subscription.freeze` · `subscription.unfreeze` · `subscription.cancel` | input / target / input | default · default · **destructive** |
| **Dispatch** | `requests.ts` | `request.claimNext` **immediate** · `request.claim` · `request.assign` · `request.expire` | immediate / target / input / target | default ×3 · **destructive** |
| **Wallets** | `wallets.ts` | `wallet.adjust` · `wallet.goodwill` | input | default |
| **Complaints** | `complaints.ts` | `complaint.uphold` · `complaint.dismiss` | input | affirm / reject |
| **Team** | `team.ts` | `operator.suspend` · `operator.reinstate` · `operator.resendInvite` · `operator.revokeInvite` · `operator.offboard` | input / target / target / target / input | default ×3 · **destructive** ×2 |
| **Pricing** | `pricing.ts` | `plan.publish` · `plan.archive` | target | default (both carry an undo) |
| **Safety** | `safety.ts` | `incident.claim` · `incident.suspend` · `incident.close` | target / input / target | default ×2 · **destructive** |
| **Cash** | `cash.ts` | `cashReport.resolve` · `cashReport.escalate` | input | affirm / reject |
| **Disputes** | `disputes.ts` | `dispute.refund` · `dispute.decline` | input | affirm / reject |
| **Fairness** | `fairness.ts` | `fairnessCase.overturn` · `fairnessCase.uphold` | input | affirm / reject |
| **Session** | `sessionCommands.ts` | `session.arabic` · `session.english` · `session.themeLight` · `session.themeDark` · `session.themeSystem` · `session.signOut` | immediate | default |

**Reachable from ⌘K:** ten registries. `TARGET_SOURCES` gained five entries —
`request`, `rider` (a wallet is keyed by its rider), `complaint`, `operator`,
`plan` — beside the five that existed.

**Not reachable, and why (CM-4).** Twelve commands in `safety`, `cash`,
`disputes` and `fairness` carry `hiddenFromPalette`: those records have **no
`ProfileEntityType`**, so `search()` cannot rank one and `CommandScope`'s
`entity` kind cannot name them. They are declared for the row menu and the bulk
bar, which is C-1's value on its own. Unblocking ⌘K for them needs `incident`,
`cash-report`, `dispute` and `fairness-case` in `PROFILE_ENTITY_TYPES`, in
`resolveLocally` and in `searchEntities` — mock-data-engineer.

**Left out, with the reason.** `Invite operator` (three typed fields;
`CommandConfirmRequest` collects one reason, one closed choice and one amount).
`Change role` (no role-change operation exists in `clients/team.ts`).
`Duplicate plan` (no `createPlan`). `Freeze wallet` (no such operation).
`Release` / `take over` on every queue (`CommandSession` carries no operator
identity). A wallet **debit** (the screen only ever credits; taking money out
from a palette is a product decision nobody has made).

**Contract additions, both additive.** `CommandConfirmRequest.amount`
(`CommandConfirmAmount`, structurally `ConfirmMoneyDialog`'s own `amount` plus
the `onChange` callback `choice.onSelect` established) and three optional
`CommandHost` capabilities — `setLanguage`, `setTheme`, `signOut` — which the
session commands refuse with a keyed sentence until `GlobalSearch` wires them.

**`COMMAND_GROUPS`** (`targets.ts`) is new: `TARGET_SOURCES` answers *how do I
find a record*, which is a different question from *what commands exist*, and
the conflation made every global and route command invisible. A surface
iterates the first for commands and the second for targets.
## 11. P2 model status — `pal/model`

Built in `src/commands/usePalette.ts` (plus additive helpers in `recents.ts` and
`shortcuts.ts`); proved in `src/commands/palette.model.test.tsx`, nine tests, one per
criterion.

| Item | State |
|---|---|
| **F1** rest state as context | done. `On this screen` · `Resume` · `Recent commands` · `Go to`, each capped at 3 and the whole at 10 rows in 4 groups. `Queues` does not render at rest; the guide row keeps its place inside `Resume` and inside the cap. |
| **AC-CP4** queues on demand | done. `command.queue.keywords` is a comma-separated, translated match vocabulary (`queue, queues, waiting, backlog` / `طابور, الطوابير, منتظر, بانتظار, قوائم العمل`); a queue's own title also matches. The block renders first when it is asked for. |
| **F3** argument carry | done. A command whose leading tokens name it is **scored on those tokens**, not on the whole query — without that, `suspend nora` scores below `MIN_MATCH_SCORE` and the palette could not take an argument at all. The remainder shows on the row as `command.carry` and pre-fills the target step. |
| **F7** prefix modes | done. `>` commands, `#` records whose id contains the query, `@` people records, `/` destinations. The glyph is stripped into `model.scope = { label, onRemove }`; `Backspace` and `Escape` take the scope off before they ascend. `>` with an empty query lists every command. |
| **F2** record step | done. `step: 'record'`, one block `command.block.recordActions` naming the record, `Open 360° profile` first, then the entity's commands with their §11.2 refusals. `Enter` on a record row still opens the profile (`descends: false`); `onDescend` is the second affordance. |
| **F4** shortcuts, data side | done for `Go to`: `subTabChord` reads the same letters `useSubTabShortcut` assigns, rendered `G X`. No chords invented for commands — no scheme exists to match. |
| **F5** ranking that learns | done. `deriveCommandUsage` over the existing `paletteRecents` log; frequency and recency weight the text score by at most 7 %, so a habit breaks a tie and never beats a better match. |
| **§6** telemetry | `palette.ran` (command id, step depth, keystrokes, ms since open) and `palette.abandoned` (query length, step). `palette.opened` stays the surface's. |
| Contract fields | `kind`, `shortcut`, `descends`, `onDescend` filled on every row the model emits; `count` and `scope` filled on the model. |

**Persistence (Q-P5) needed no new key.** `UI_STATE_KEYS.paletteRecents` already exists and
`createCachedStore` already namespaces by operator id, so ranking, `Resume` and `Recent
commands` read one per-operator log. `src/lib/persistence.ts` is unchanged.

**Three tests in `palette.test.tsx` now fail, and must change**, because AC-CP3 removed the
block they assert: *offers live queue counts … with nothing typed*, *does not show a prompt
where it now has something to offer*, and *ascends on Backspace … and closes only from
root* (this last one uses the `Queues` group only as a proxy for "still open"; any rest-state
group works). The file's owner is the surface.
## 11. P1 status — 2026-09-05

Built on `pal/surface`, against §3 (Look), §4 (Feel) and the *look* half of §6. The model
(`usePalette.ts`) and the registry (`commands/<domain>.ts`) were built in parallel on their
own branches; the row contract they meet at is `PaletteRow`'s optional fields.

**Landed.** The centred `Dialog` at 640 × 16vh capped at 60vh, over the existing scrim, as
`DialogContent size="palette"` — the one place that geometry is written. The 240px top-bar
trigger with a platform-correct keycap, and it is a real `DialogTrigger`, which is what
AC-CP10 rests on. Three doors: `⌘K` / `Ctrl K`, the trigger, and `/` outside a typing
target. A 52px input row carrying the magnifier, the committed chips, the prefix scope chip
and an `Esc` legend, with the query at 16px. One-line rows with a glyph by `kind`, the meta
after ` · `, and a right slot for the shortcut's keycaps, a count, a chevron and the active
row's `↵`; `kind: 'record'` is the one two-line row; the matched substring of the query is
bolded in the title. A 36px footer with the step's key hints, the prefix hint at rest and
the tally at inline-end. `Tab` / `Shift+Tab` move a group at a time and `→` descends where
the row says it can, both of which needed `cmdk` to become controlled.

**Left out, and why.** `⌘↵` (run a destination and keep the palette open) is not built: a
destination row's `onSelect` closes the palette from inside the model, and there is no way
to ask it not to from the surface. It needs a model-side variant and belongs with F5.

**Verified.** `npx tsc -b --noEmit` clean. `src/commands` + `src/shell`: 370 of 371, the one
failure a load-dependent timeout in `commands.test.tsx` that is present at `7aa8e98` and
passes when that file runs alone. `scripts/harness/palette.mjs` PASS at 1280×720 and
1280×900, in Arabic and in dark: width 640, top edge 115 / 144 against a wanted 115 / 144,
the two inline gaps equal at 320, no vertical movement when a 32-row result arrives, focus
in the input on open and back on the trigger after `Esc`.

**Not P1, and still open.** The rest-state diet (AC-CP3 / AC-CP4, "no queues before a key is
pressed") is the model's half and is not done here — the harness shows five queue rows at
rest. Row glyphs fall back to `row.icon`, so commands have one and queues and destinations
do not until the model fills `kind`.
