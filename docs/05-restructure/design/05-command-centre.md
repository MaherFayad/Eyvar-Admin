# 05 — The command centre (⌘K)

**Status:** plan. Nothing here is built yet.
**Owner ask:** *"command K should open a command center so the user can type commands, or
search for anything on the system … so there is really rich context menu, not just search
but making actions also."*

**Supersedes:** design spec §5's characterisation of ⌘K as *global search*. It does not
supersede §5's mechanics — the scope chip, the two-line row, the escape hatch and the
legacy-name resolution all survive verbatim. What changes is that finding a thing stops
being the only thing the surface can do.

---

## 1. What it is

Today ⌘K answers one question — **where is it?** — and the `action` kind in
`SearchResult` (`src/data/types/profile.ts:92`) is a section heading with nothing
behind it: `activate()` in `GlobalSearch.tsx` can only navigate or open a profile.
An "action" result today is a link wearing a verb.

The command centre answers three:

| Verb | Question | Example query | Result |
|---|---|---|---|
| **Go** | where is it? | `pricing`, `renewal pipeline` | navigate to a sub-tab or saved view |
| **Find** | who/what is it? | `DRV-0204`, `Al-Harbi` | open the 360° profile layer |
| **Do** | change something | `suspend`, `export`, `switch to arabic` | **execute a command** |

Only the third is new, and it is the whole point. `Go` and `Find` keep working exactly
as specified in §5.

---

## 2. The mapping — one registry, four surfaces

This is the part the owner asked to be written down, and it is worth more than the
palette itself.

Right now the *same operator action* is declared in four unrelated places:

| Surface | Where it is declared today |
|---|---|
| Row kebab / inline row action (D8) | `rowActions={[…]}` inline in `CaptainsView.tsx:187` |
| Bulk bar | `bulkActions={[…]}` inline in `CaptainsView.tsx:203` |
| Page header `More actions` | inline in each screen's `PageHeader` props |
| ⌘K | nowhere — it cannot execute anything |

Four declarations of `Suspend captain` means four chances for the label, the permission
check, the confirmation copy and the toast to disagree — and they already do: the row
action carries a `disabled` predicate and the bulk action does not, so the same operator
is stopped in one place and allowed in the other.

**The plan is one registry per domain, consumed by all four.**

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
| **CQ-1** | §2.6 / §5 require an **anchored popover on the field** and explicitly forbid a centred command palette. A three-state palette with a confirm step is 480×420 and grows — anchored under a 400px field at the top of the viewport, it is fine at 900px tall and cramped at 720px. | **Stay anchored.** §2.6's reason (never relocate the thing the operator aimed at) still holds, and the reference is an anchored popover. Cap the list at 8 rows with an internal scroll; the confirm step replaces the list rather than extending it. Revisit only if measurement says it fails at 1280×720. |
| **CQ-2** | §5 fixes section order **Destinations · Records · Actions**. A command centre wants verbs first. | **Order by query shape, not by fixed rank.** A query that matches a command's `keywords` with a leading verb puts `Do` first; everything else keeps §5's order. The order is derived, never a user setting. |
| **CQ-3** | AC-60 says results the role cannot open **never appear**. §11.2 says an action the role cannot use renders **disabled in place with its reason**. Both cannot hold for an action row. | **Split by kind.** Destinations and records: AC-60, filtered by the server, absent. Actions: §11.2, present and disabled with the reason — because "you cannot suspend this captain, their card expired" is information the operator needs, and its absence is the exact legacy defect (`:10237`) §11.2 exists to kill. |
| **CQ-4** | Executing from the palette means the palette can mutate. Nothing in the shell contract says a shell surface may write. | **It may, through the command registry only.** The palette never calls a client directly; it calls `command.run`. That keeps the write path identical to the button path, so there is one thing to test. |

**CQ-1 is superseded (2026-09-05).** The owner overrode §2.6 for this surface and asked for
a centred palette; the ruling is in `docs/RULINGS.md` under *Standing owner overrides*, and
the measurement CQ-1 deferred to is what settles it. CQ-1's reason was that §2.6 forbids
relocating the thing the operator aimed at — but under D9 the thing they aim at is a command
centre, not a field, and a 240px trigger that opens it keeps the aim intact. The palette is
now a `Dialog`: centred, 640px, top edge at 16vh, capped at 60vh with the list scrolling
inside, over the existing scrim. CQ-1's 8-row cap goes with it. **CQ-2, CQ-3 and CQ-4 are
unchanged**, and so is everything §6 below carries in except §7.3.3, which described a
popover.

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

## 7. Phasing

| Phase | Deliverable | Depends on |
|---|---|---|
| **C-1** | `src/commands/registry.ts` + `captains.ts`. `CaptainsView` consumes it for its row and bulk actions. No palette change. | D8's row-action rendering rule |
| **C-2** | The `Do` section executes. Immediate + `needs-target` commands only. | C-1 |
| **C-3** | Selection and open-profile pre-seeding; the confirm step; undo-on-toast. | C-2, and the `CommandOutcome` toast contract |
| **C-4** | Context list at rest — recent destinations, recent commands. | persistence (Q1, still open) |
| **C-5** | The remaining domains' registries. | wave 2/3 specs landing |

**C-1 is worth doing whether or not the palette is ever built**, because it removes the
four-way duplication on its own. If the plan gets cut, cut from the bottom.

---

## 8. Open questions

- **CQ-5** Does a command need to be undoable to run without a confirm step? Proposed:
  yes — `affordance: 'destructive'` without an undo handle must confirm. Needs the
  owner's call on whether `Suspend captain` is undoable in the backend or merely
  re-runnable in reverse.
- **CQ-6** Q1 (persistence) is still open, and C-4 cannot start until it closes —
  "recent commands" has to live somewhere.
- **CQ-7** D4 (the role model) is still open. `unavailable` cannot be written against
  permissions that do not exist yet; until then it evaluates domain state only
  (`driver.suspended`), not role.
