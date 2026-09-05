# 05 — The command centre (⌘K)

**Status:** binding. This is the whole design of the palette — the surface, the feel, the
model, the registry it runs on, and its acceptance criteria.
**Code:** `src/shell/GlobalSearch.tsx` (the trigger), `src/components/command/CommandPalette.tsx`
(rows, groups, footer), `src/commands/usePalette.ts` (steps, blocks, ranking),
`src/commands/registry.ts` and `src/commands/<domain>.ts` (the registry).
**Drawn by:** `scripts/harness/palette.mjs` at 1280×720 and 1280×900, in both languages and
both themes.

**Supersedes** the design spec §5's characterisation of ⌘K as *global search*. It does not
supersede §5's mechanics — the scope chip, the two-line row, the escape hatch and the
legacy-name resolution all stand. What changed is that finding a thing stopped being the only
thing the surface can do.

---

## 1. What it is

A search box answers one question — **where is it?** — and an `action` result on such a
surface is a link wearing a verb: it can only navigate or open a profile.

The command centre answers three:

| Verb | Question | Example query | Result |
|---|---|---|---|
| **Go** | where is it? | `pricing`, `renewal pipeline` | navigate to a sub-tab or saved view |
| **Find** | who/what is it? | `DRV-0204`, `Al-Harbi` | open the 360° profile layer |
| **Do** | change something | `suspend`, `export`, `switch to arabic` | **execute a command** |

The third is what makes it a console rather than a search box. `Go` and `Find` work exactly
as the design spec §5 specifies.

---

## 2. The mapping — one registry, four surfaces

This is the part the owner asked to be written down, and it is worth more than the
palette itself.

An operator action reaches the operator through four surfaces — the row kebab (D8), the bulk
bar, the page header's `More actions`, and ⌘K. Declaring it four times gives the label, the
permission check, the confirmation copy and the toast four chances to disagree, and the
classic symptom is a row action that carries a `disabled` predicate while the bulk action
does not, so the same operator is stopped in one place and allowed in the other.

**One registry per domain, consumed by all four.**

```
src/commands/
  registry.ts        the typed Command shape + the resolver
  captains.ts        every command that acts on a captain
  applications.ts
  compliance.ts
  finance.ts
  shell.ts           language, theme, sign out, go to…
```

```ts
export interface Command<T = unknown> {
  /** Stable, dotted, never translated. The telemetry key and the test handle. */
  id: CommandId                       // 'captain.suspend'
  titleKey: string                    // 'people.action.suspend' — the ONE label
  section: 'do' | 'create' | 'go'
  /** Synonyms, legacy names, and the Arabic term. What makes `deactivate` find
      `Suspend captain`. Legacy names come from the route table's `legacyPageIds`,
      the same source §5 already uses for destinations. */
  keywords: readonly string[]
  icon?: LucideIcon

  /** Where it may appear. A command with `entity: 'driver'` shows in the captain
      row menu, in the bulk bar over captains, and in ⌘K once a captain is the
      target — from this one line. */
  scope:
    | { kind: 'global' }
    | { kind: 'route'; subTabId: SubTabId }
    | { kind: 'entity'; entityType: ProfileEntityType; plural: boolean }

  /** §11.2 — never hidden, DISABLED IN PLACE with this reason. */
  unavailable?(ctx: CommandContext<T>): string | null

  /** D8 — how it renders when it is a row action. */
  affordance: 'default' | 'decision-affirm' | 'decision-reject' | 'destructive'

  /** Whether it needs a target picked, input typed, or nothing. §3. */
  arity: 'immediate' | 'needs-target' | 'needs-input'

  run(ctx: CommandContext<T>): void | Promise<CommandOutcome>
}
```

`CommandOutcome` carries the toast copy and, where the action is reversible, the undo
handle — which is how D8's "a one-click approve is a one-click irreversible act" gets
answered once instead of per screen.

**Acceptance for the mapping, independent of the palette:**

- **CM-1** `CaptainsView` declares no action inline. It names command ids.
- **CM-2** A command's label exists in exactly one place. Grep for the literal
  `Suspend` returns one dictionary entry and no `.tsx`.
- **CM-3** A command's `unavailable` predicate is evaluated identically in the row
  menu, the bulk bar and the palette. One test asserts the three agree.
- **CM-4** Every command id appears in the palette **or** declares
  `hiddenFromPalette` with a reason. No action is reachable only by mouse.

---

## 3. Typing a command with an argument

A palette that can only run zero-argument commands is a keyboard shortcut list. The
useful ones take a target.

```
⌘K  →  suspend                       ┌ Do ───────────────────────────┐
                                     │ ⏸  Suspend captain         →  │
                                     │ ⏸  Suspend corporate account →│
                                     └───────────────────────────────┘

Enter on `Suspend captain` — the palette does not close, it DESCENDS:

⌘K  [Suspend captain] nora           ┌ Captains ─────────────────────┐
     └ removable chip, same as §5's  │ Nora Al-Harbi   DRV-0204      │
       scope chip. Backspace on an   │ Nora Al-Qahtani DRV-0311      │
       empty query goes back up.     └───────────────────────────────┘
```

Three states, one field:

| State | Input holds | List holds |
|---|---|---|
| root | free text | Do · Go · Records, in §5's order |
| target | `[command]` chip + free text | candidate targets for that command only |
| confirm | `[command]` `[target]` chips | the consequence sentence + `Enter to confirm` |

**The `confirm` step replaces D8's per-row confirmation dialog for anything reached
through the palette.** A destructive command reached from a row still confirms per D8;
a destructive command reached from the palette confirms *in* the palette. Two shapes,
one decision — recorded so the next person does not invent a third.

**Pre-seeded targets.** If rows are selected when ⌘K opens, the selection *is* the
target: `⌘K → suspend → Enter` acts on the 2 selected captains and skips the target
step, with the chip reading `[2 captains]`. If a 360° profile layer is open, that entity
is the pre-seeded target. This is what makes the palette faster than the bulk bar rather
than a second way to reach it.

---

## 4. Context — what is offered before a key is pressed

An empty palette today shows a prompt. It should show what is most likely next, in this
order:

1. **Commands for what is on screen.** Selection first, then open profile, then route.
2. **Resume** — the last three destinations, which is the cheapest fix for the seven
   moved pages §4.3.4 is worried about.
3. **Recent commands**, most-used first, per operator.

None of that requires a query, and it is what turns the surface from a search box into a
console.

---

## 5. Rulings this needs

These conflict with rules already in force. They are called out rather than quietly
broken.

| # | Conflict | Proposed ruling |
|---|---|---|
| **CQ-1** | §2.6 / §5 required an **anchored popover on the field** and explicitly forbade a centred command palette. | **Superseded** — see the note under this table. The palette is a centred `Dialog`. |
| **CQ-2** | §5 fixes section order **Destinations · Records · Actions**. A command centre wants verbs first. | **Order by query shape, not by fixed rank.** A query that matches a command's `keywords` with a leading verb puts `Do` first; everything else keeps §5's order. The order is derived, never a user setting. |
| **CQ-3** | AC-60 says results the role cannot open **never appear**. §11.2 says an action the role cannot use renders **disabled in place with its reason**. Both cannot hold for an action row. | **Split by kind.** Destinations and records: AC-60, filtered by the server, absent. Actions: §11.2, present and disabled with the reason — because "you cannot suspend this captain, their card expired" is information the operator needs, and its absence is the exact legacy defect (`:10237`) §11.2 exists to kill. |
| **CQ-4** | Executing from the palette means the palette can mutate. Nothing in the shell contract says a shell surface may write. | **It may, through the command registry only.** The palette never calls a client directly; it calls `command.run`. That keeps the write path identical to the button path, so there is one thing to test. |

**CQ-1 is superseded.** The owner overrode §2.6 for this surface and asked for a centred
palette; the override is in `docs/RULINGS.md` under *Standing owner overrides* and its text is
§7 and §8 below. CQ-1's reason was that §2.6 forbids relocating the thing the operator aimed
at — but under D9 the thing they aim at is a command centre, not a field, and a 240px trigger
that opens it keeps the aim intact. The palette is a `Dialog`: centred, 640px, top edge at
16vh, capped at 60vh with the list scrolling inside, over the existing scrim. CQ-1's 8-row cap
goes with it. **CQ-2, CQ-3 and CQ-4 stand**, and so does everything §6 carries in except
§7.3.3, which described a popover.

Recorded as **D9** in `DECISIONS.md`.

---

## 6. Constraints carried in from the existing spec

- **§14 / RTL** — the chip's position mirrors; the `⌘ K` glyph order does not; the
  magnifier does not mirror. A command's `titleKey` is translated, its `id` never is,
  and `keywords` carry the Arabic synonyms so the palette is usable in Arabic. Today
  Arabic is unreachable at all — this is blocked behind that.
- **§7.4 / AC-74** — a command row must never render a raw i18n key. The
  `LOOKS_LIKE_I18N_KEY` guard in `GlobalSearch.tsx` stays until the data layer carries
  `titleKey` properly.
- **`cmdk` owns the arrow keys.** `useRovingFocus` is not used here, and the descend /
  ascend transitions must not fight it: changing state re-renders the list, so the
  active index resets to 0 deliberately rather than by accident.
- **Escape** closes from the root state and **ascends** from target/confirm. Two
  meanings for one key is a real cost; the alternative — Escape always closing — throws
  away a typed target, which is worse.
- **Telemetry** keys off `command.id`, so "which actions do operators actually reach by
  keyboard" is answerable without instrumenting four surfaces.

---

## 7. The surface

**A modal dialog, not a popover.** Horizontally centred; the top edge fixed at `16vh` so the
panel never jumps as results change; **640px** wide at the 1280px minimum, a full-width sheet
from the top on the compact shell. Max height `60vh` with the list scrolling inside.
`bg-popover`, `border-border`, `rounded-xl`, `shadow-3` — the same surface recipe as
`DialogContent`, expressed as `DialogContent size="palette"`, which is the one place this
geometry is written and is **not a size a screen may choose**. The scrim is the existing Dialog
overlay. Dark falls out of the tokens.

```
+----------------------------------------------------------------+
| (Q)  [Suspend captain x]  nora|                          Esc    |  52px - 16px type - chips inline
|----------------------------------------------------------------|
| CAPTAINS                                                       |  group label, 12px, muted
| o  Nora Al-Harbi - DRV-0204 - Active                      ret   |  36px rows - one line - right slot
| o  Nora Al-Qahtani - DRV-0311 - On trip                        |
|                                                                |
| GO TO                                                          |
| >  Captains - Operations                                  G C  |  letter shortcut at the end
|----------------------------------------------------------------|
| up/down move   ret select   Tab next group   back        2 results |  36px footer
+----------------------------------------------------------------+
```

- **Input row.** The magnifier (which never mirrors, §9.5), the committed steps as removable
  chips, the prefix scope chip, the query at 16px, and an `Esc` legend at the end. The top-bar
  field no longer holds the query.
- **Group labels.** `text-xs font-medium text-muted-foreground`, 8px above and 4px below.
  **Not uppercase and not letter-spaced** — D18 bans uppercase labels and wins over any
  small-caps sketch. Empty groups do not render.
- **Rows.** 36px, one line: a 16px glyph by `kind`, the title in `text-sm`, the meta in muted
  ink after a middle dot. The right slot carries the shortcut's keycaps, a count, a chevron for
  a row that descends, or the return glyph on the active row. A refused command **keeps its
  row**, disabled, with the reason as its meta text (CQ-3). `kind: 'record'` is the one two-line
  row: name and ID on line one, status and last activity on line two.
- **Highlight.** The active row takes `bg-accent`; the matched substring of the query is bold
  in the title.
- **Footer.** Key hints for the current step at the inline-start, the tally or the step name at
  the inline-end. In the confirm step it reads `confirm / cancel`.
- **Top-bar trigger.** A 240px control that looks like a field, reads *Search or run a command*
  and carries a platform-correct command keycap. It is a real `DialogTrigger`, which is what the
  focus-return criterion rests on. An operator who types into "the search box" still lands in
  the right place.
- **The rest state is context, not inventory.** At most ten rows in at most four groups:
  *On this screen* (at most 3 — commands for the selection, then the open profile, then the
  route), *Resume* (at most 3 last destinations), *Recent commands* (at most 3), and *Go to*
  (the five workspaces, each with its letter shortcut). **No queue rows before a key is
  pressed.** Queue counts appear where they are asked for: type `queue`, `waiting`, or a
  queue's name.

## 8. The feel

- **Opening.** The command key, the top-bar trigger, or `/` when focus is not in a typing
  target. The overlay fades in over 150ms and the panel scales 95 to 100 over 150ms; 100ms out.
  Both are licensed durations; no `transition-all`; `motion-reduce` drops the scale.
- **Focus.** The input takes focus on open. The dialog **traps** focus — §7.3.3's "a popover
  does not trap focus" stops applying and the Dialog rules apply instead. Closing returns focus
  to the element that opened it. Handing off to a layer follows D-11a: the layer wins.
- **The panel never moves.** Local ranking is synchronous. Record lookups debounce at 150ms and
  show a one-row *Looking up...* inside their own group, never a spinner over the list; stale
  responses are dropped. Height grows downward to `60vh` and then scrolls.
- **Keys.** Up and down move across group boundaries; `Tab` and `Shift+Tab` jump to the next and
  previous group; `Enter` runs or descends; the forward arrow descends on a row that says it
  can; `Backspace` on an empty query ascends one step; `Esc` ascends when a chip is present and
  closes at root.
- **Selection carries.** Rows selected on the screen pre-seed the target and the chip reads
  `[2 captains]`.
- **Outcome.** The palette closes on a successful run and the toast carries the object name and
  Undo (R9). A refused run never closes the palette; the reason is on the row.
- **Quiet.** No sounds, no celebration, no badges inside the palette. One highlight, one accent.

## 9. Accessibility, Arabic, states, copy, motion, performance

**Accessibility.** `role="dialog"`, `aria-modal`, labelled by the input's label; listbox and
option semantics from the command primitive. A visually hidden live region announces the result
count on change. Every row is a real option and every refusal is real text, not a tooltip
(§11.2, §5.7). Focus is visible on rows and on the `Esc` legend. **The palette input carries
no focus ring, and it is the only control here that does not** — the palette opens with the
input focused, so a ring there would be permanent chrome; the reason is written at the control.

**Arabic and RTL.** The panel mirrors with `dir`; the magnifier does not (§9.5). Keycaps keep
Latin glyphs and sit at the inline-end. Group labels and meta separators come from the
dictionary. Registry `keywords` carry Arabic terms, so the Arabic verb finds *Suspend captain*.
Record IDs stay LTR inside bidi isolation. A command's `titleKey` is translated; its `id` never
is.

**Four states.** Content; empty (*Nothing matches "x". Try an ID like DRV-0204, or a command
like suspend*); loading (one row per async group); error (one row with *Retry*). The panel is
never blank and never a bare spinner.

**Copy.** Every string is a key in `src/commands/copy.ts` with an Arabic entry. Sentences take a
full stop, labels do not (R6).

**Motion.** 150ms in, 100ms out, opacity and scale only. No duration tokens (D-13).

**Performance.** Ranking is synchronous over the command and destination sets. Records are the
only async work, capped at 8 per group with a *more* row that descends into the escape hatch.
Stale lookups are cancelled by query token.

**Telemetry.** `palette.opened` (source: shortcut, trigger or slash), `palette.ran` (command id,
step depth, keystrokes, ms open), `palette.abandoned` (query length, step). Keyed off
`command.id`, so *which actions do operators actually reach by keyboard* is answerable without
instrumenting four surfaces.

## 10. What makes it powerful, and what it still lacks

The three verbs are **Go**, **Find** and **Do**. The palette is only as powerful as what those
three reach and how few keystrokes each costs.

| # | Capability | State |
|---|---|---|
| F1 | The rest state is context, not inventory (§7) | in force |
| F2 | **Record actions in place.** Descending on a record row shows that record's commands as a nested group labelled with the record | in force |
| F3 | **Arguments in one line.** `suspend nora` ranks *Suspend captain* first and, on `Enter`, descends with `nora` already typed as the target query | in force |
| F4 | **Shortcuts, shown.** Letter shortcuts render on *Go to* rows | in force |
| F5 | **Ranking that learns** — recency and frequency per operator, weighted into the command score | not built; needs the persistence question closed |
| F6 | **Registry breadth.** The registry spans the domains; twelve commands in `safety`, `cash`, `disputes` and `fairness` still carry `hiddenFromPalette` with a reason | partly; see §13 |
| F7 | **Prefix modes, quiet.** `>` commands, `#` IDs, `@` people, `/` destinations; typing a prefix shows a scope chip and the rest-state footer hints them once | in force |
| F8 | **Preview pane for records** — a 280px pane on the end side with the 360 header and the three most likely commands, shown only when the panel can be 880px wide | not built |
| F9 | **The escape hatch stays last.** *Search for "..." in Captains* while a query is present, at root only | in force |
| F10 | **Bulk from the palette.** With rows selected, the command runs on the selection and skips the target step | in force |

**Deliberately absent.** Natural-language "ask me anything" rows. The console has no help
centre and no model behind it, and a row that answers nothing is worse than no row.

## 11. Acceptance criteria

- **AC-CP1** The command key, `/` outside a typing target, and the top-bar trigger each open the palette with focus in its input.
- **AC-CP2** The panel is horizontally centred within 1px, its top edge at 16vh, 640px wide, at 1280x720 and 1280x900; the top edge does not move between the rest state and a 40-row result.
- **AC-CP3** At rest the list holds at most ten rows in at most four groups, and no group is *Queues*.
- **AC-CP4** Typing `queue`, `waiting` or a queue's name shows the *Queues* group with waiting counts.
- **AC-CP5** The arrow keys cross group boundaries; `Tab` moves to the next group; `Backspace` on an empty query ascends; `Esc` ascends with a chip present and closes at root.
- **AC-CP6** `suspend nora` ranks *Suspend captain* first, and `Enter` opens the target step with `nora` as the query.
- **AC-CP7** Descending on a record row shows that record's commands under a label naming the record; a refused command is present, disabled, with its reason.
- **AC-CP8** Every *Go to* row shows its letter shortcut, and the footer shows the hints for the current step.
- **AC-CP9** The Arabic build mirrors the panel and keeps the magnifier and the keycap glyphs unmirrored.
- **AC-CP10** Closing returns focus to the opener; opening a layer from a row hands focus to the layer.

**AC-CP2 and AC-CP9 need `scripts/harness/palette.mjs`.** jsdom does no layout, so a green
suite says nothing about a centred panel or a mirrored one.

## 12. Decisions in force

| # | Decision |
|---|---|
| **Q-P1** | §2.6 and CQ-1 are overridden for this surface only: the palette is a centred modal. Recorded in `docs/RULINGS.md`. |
| **Q-P2** | The top-bar field stays, as a 240px trigger reading *Search or run a command* with a command keycap. Discoverability for a new operator; the shortcut itself is taught by the onboarding welcome. |
| **Q-P3** | `Esc` with a chip present **ascends** one step rather than closing. Backspace does the same, and closing would throw away a half-built command. |
| **Q-P4** | Prefix modes ship, quiet: no UI beyond a chip when typed, and one footer hint at rest. |
| **Q-P5** | Recents and ranking persist in the UI store that already persists theme and language, per operator, on this machine. Server-side later if it matters. |
| **Q-P6** | The preview pane is records-only and needs an 880px panel. Not built. |
| **Q-P7** | Dispatch and wallets grow the registry first: the most-repeated actions on My Work. |
| **Q-P8** | `/` is a door, when focus is not in a typing target. |

## 13. Open questions

| # | Question | Who answers | Blocked until then |
|---|---|---|---|
| **CQ-5** | Does a command need to be undoable to run without a confirm step? Proposed: yes — `affordance: 'destructive'` without an undo handle must confirm. Needs the owner's call on whether `Suspend captain` is undoable in the backend or merely re-runnable in reverse. | business owner | the confirm step's trigger rule |
| **CQ-7** | D4's role model. `unavailable` cannot be written against permissions that do not exist; until then it evaluates domain state only, never role. | business owner | every role-shaped refusal in the registry |
| **CP-Q1** | **The placeholder still reads *Search*.** It renders the old top-bar field's key. §9 asks for one that names the verbs — *Type a command, a name or an ID*. A new key is a copy decision. | ux-writer | one string |
| **CP-Q2** | **Running a destination without closing the palette.** A destination row's select handler closes the palette from inside the model, and the surface has no way to ask it not to. It needs a model-side variant. | frontend-engineer | the operator working through a list of destinations |
| **CP-Q3** | **Four record-less domains are unreachable from the palette.** Twelve commands in `safety`, `cash`, `disputes` and `fairness` carry `hiddenFromPalette`. Unblocking them is not mechanical: each needs a `ProfileEntityType` union member, a 360 `SECTIONS` list (*which cards does a safety incident's profile show* is a design decision), a `resolveLocally` branch, a `searchEntities` push, a `ProfileRecord` variant, the rail and identity-card switches, an index-route entry, and a search-test query — because the rule that *a search hit is never a 404* requires the whole chain to render. | product-designer, with mock-data-engineer | those twelve commands staying keyboard-unreachable |
