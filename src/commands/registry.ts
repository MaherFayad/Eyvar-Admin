/**
 * The command registry — **D9**, `design/05-command-centre.md` §2, phase **C-1**.
 *
 * ## Why this file exists before the palette does
 *
 * `Suspend captain` is declared in **four** unrelated places today: the row
 * kebab and the bulk bar (`CaptainsView.tsx`, inline), the page-header
 * overflow, and — as a dead `kind: 'action'` — global search. The declarations
 * already disagree. The row action carried `disabled: (d) => !canWrite ||
 * d.suspended`; the bulk action carried nothing at all. **The same operator was
 * stopped in one surface and allowed in the other**, which is not a styling
 * inconsistency, it is two different answers to "may I do this".
 *
 * The plan's own note: *"C-1 is worth doing whether or not the palette is ever
 * built"*. This is that: one declaration per action, consumed by every surface,
 * so a label, a refusal and a confirmation cannot drift apart because they were
 * written twice.
 *
 * ## The four acceptance criteria this file is shaped by
 *
 *   **CM-1**  a screen declares no action inline; it names command ids and
 *             renders what `resolveCommands` returns.
 *   **CM-2**  a command's label lives in exactly one place — `titleKey`. No
 *             `.tsx` names the string, and no surface mints a parallel one.
 *   **CM-3**  the refusal predicate is evaluated identically in the row menu,
 *             the bulk bar and the palette. There is exactly one function that
 *             may answer it (`unavailableReason`) and exactly one function that
 *             may dispatch (`runCommand`), so "identically" is structural
 *             rather than a promise. `commands.test.ts` asserts the three agree.
 *   **CM-4**  every id either appears in the palette or declares
 *             `hiddenFromPalette` with a reason. No action is mouse-only.
 *
 * ## Two rulings carried in
 *
 *   **CQ-4**  a surface may mutate **only** through `command.run`. The registry
 *             never calls a client at module scope — every import of
 *             `@/data/clients` in a domain registry is reached from inside a
 *             `run` body and nowhere else. That keeps the write path identical
 *             whether the operator used a button, the bulk bar or ⌘K, so there
 *             is one thing to test.
 *   **CQ-7**  role gating is **out of scope**. Q4/D4 are open: `permission` is
 *             `null` on all 35 route-table rows and `session.subTabPermissions`
 *             is `{}`. So `unavailable` evaluates **domain state only**
 *             (`driver.suspended`), and every role question goes through the
 *             one seam below — `roleRefusal`. When Q4 lands, that function
 *             changes and no domain registry does.
 *
 * ## §11.2 / AC-368 is why `unavailable` returns a string
 *
 * An action the operator may not take is **never hidden**. It is disabled in
 * place **with its reason rendered as real text** — not a tooltip (§5.7 confines
 * a tooltip to *naming* a control; §8.4.4 says the reason renders on a second
 * line inside the item). `components/table/rowActions.tsx` already implements
 * exactly that contract with `reason` and `aria-describedby`, and it wants
 * `string | null` per row. So `unavailable` returns `string | null`: the
 * translated sentence, or `null` for "available". A boolean here would have
 * thrown the sentence away at the only layer that knows which of several
 * refusals applied.
 *
 * The legacy roster is the counter-example this contract exists to kill: at
 * `eyvar_ops_panel_v40_fixed.html:4113` the profile renders `Reinstate account`
 * **or** `Suspend account` and never both, so an operator looking at a
 * suspended captain cannot see that suspending is a thing that exists, and one
 * looking at an active captain cannot see reinstating. Absence is not an
 * explanation.
 */

import type { LucideIcon } from 'lucide-react'
import type { ProfileEntityType } from '@/data/types'
import type { Language, Translate } from '@/lib'

/* ───────────────────────────── the shape ───────────────────────────── */

/**
 * Stable, dotted, **never translated**. The telemetry key (§6: telemetry keys
 * off `command.id`, so "which actions do operators reach by keyboard" is
 * answerable without instrumenting four surfaces) and the test handle.
 *
 * The template type is the whole enforcement: `'suspend'` does not compile,
 * `'captain.suspend'` does. A closed union would be better still and is not
 * possible while six domain registries are being written in parallel by six
 * agents — the uniqueness half is asserted in `commands.test.ts` instead.
 */
export type CommandId = `${string}.${string}`

/**
 * §5 / **CQ-2**: the palette orders `Do · Go · Records` by **query shape**, not
 * by fixed rank — a query whose leading token matches a command keyword puts
 * `Do` first. The section is what that ordering sorts; it is not a heading a
 * screen renders.
 */
export type CommandSection = 'do' | 'create' | 'go'

/**
 * **D8** — how the command renders when it is a row action.
 *
 * `decision-affirm` / `decision-reject` are the paired approve/reject shape a
 * work queue needs. `destructive` is **R5a red**, and R5a spends red only on
 * the unrecoverable — a suspension is reversible, so it is `default`, which is
 * the same call `people/copy.ts` already recorded for the confirmation's
 * primary button.
 */
export type CommandAffordance = 'default' | 'decision-affirm' | 'decision-reject' | 'destructive'

/**
 * §3 — what the palette must collect before it can run this.
 *
 *   `immediate`     nothing. `Switch to Arabic`.
 *   `needs-target`  a record, or a selection. `Reinstate captain`.
 *   `needs-input`   a record **and** something typed. `Suspend captain` needs
 *                   the reason the captain will be shown, and `suspendDriver`
 *                   requires one by contract.
 */
export type CommandArity = 'immediate' | 'needs-target' | 'needs-input'

/**
 * Where the command may appear.
 *
 * `plural` is the line that makes one declaration serve two surfaces: a command
 * with `{ entityType: 'driver', plural: true }` shows in the captain row menu,
 * in the bulk bar over captains, and in ⌘K once captains are the target — from
 * that one line. `plural: false` means the command has no meaning over a set
 * (opening twenty 360° profiles is not an action), so it is offered on a row
 * and withheld from the bulk bar.
 */
export type CommandScope =
  | { kind: 'global' }
  | { kind: 'route'; subTabId: SubTabId }
  | { kind: 'entity'; entityType: ProfileEntityType; plural: boolean }

/**
 * A `SubTabRoute['subTabId']`. The route table types it as a `string` today —
 * all 35 ids are data in `fixtures/routeTable.ts`, not a union — so this alias
 * names the intent without inventing a second source of truth for it.
 */
export type SubTabId = string

/**
 * The one boolean a command may ask about the operator, and the **seam for
 * Q4**.
 *
 * Every People view is handed `canWrite`, which today is
 * `shell.permissions.permissions.includes('approve_drivers')`
 * (`PeopleScreen.tsx:105`). That is a real permission check living in a screen.
 * **CQ-7 forbids a domain registry from evaluating it**, so it is carried here
 * and read in exactly one place: `roleRefusal`.
 *
 * When **Q4 / D4** closes, this interface gains the permission set, `roleRefusal`
 * consults it, and nothing in `captains.ts` — or in the five registries that
 * follow — changes. That is the point of routing it through one function.
 */
export interface CommandSession {
  /**
   * **Q4 seam.** One boolean standing in for the whole permission set, because
   * the whole permission set does not exist yet. Do not read this from a
   * domain registry; call `roleRefusal`.
   */
  canWrite: boolean
}

/**
 * What a command may reach the outside world with — **CQ-4's other half**.
 *
 * A command does not know about `react-router`, about `sonner`, or about which
 * dialog component the screen mounted. It knows it can open a profile and it
 * knows it can ask a question. Everything else it does, it does through
 * `@/data/clients` inside its own `run`.
 *
 * Deliberately two methods. `navigate` belongs to the `go` section and arrives
 * with `shell.ts` (P2-T7); adding it now would be a seam with nothing behind it.
 */
export interface CommandHost {
  /**
   * Open the 360° profile layer over the current route — **AC-21 / AC-22**, an
   * overlay search param, never a route change.
   */
  openProfile(entityType: ProfileEntityType, entityId: string): void
  /**
   * **The shell's three settings, as capabilities — F6, `sessionCommands.ts`.**
   *
   * Optional, and every one of them is. A host that has not wired them refuses
   * the command with a sentence (§11.2) instead of throwing at the press, so
   * the registry lands before the surface does and nothing crashes in between.
   * `AppLayout` already owns all three (`AppLayout.tsx:347`, `:693`, `:194`).
   */
  setLanguage?(language: Language): void
  /**
   * Structurally `ThemeChoice` (`hooks/useTheme.ts`), written out rather than
   * imported so this contract stays free of a React module.
   */
  setTheme?(theme: 'light' | 'dark' | 'system'): void
  /**
   * The **shell's** sign-out, which asks about unsaved work first
   * (`SignOutDirtyDialog`), never `clients/auth`'s bare mutation.
   */
  signOut?(): void
  /**
   * Ask the operator to confirm, and resolve with what they typed.
   *
   * Resolves with the **reason string** when they confirm (the empty string
   * when the request declared no reason field), and with **`null`** when they
   * dismiss. The host keeps the surface busy until the promise returned by
   * `run` settles, so the dialog cannot be dismissed out from under a mutation
   * in flight.
   *
   * §3 records that the palette will eventually confirm *in* the palette while
   * a row still confirms in a modal. Both are hosts; both satisfy this one
   * signature, which is why the confirmation copy lives in the command and not
   * in either surface.
   */
  confirm(request: CommandConfirmRequest): Promise<string | null>
}

/**
 * The question, already translated. §9.1 / §5.3: the title states the **verb
 * and the count**, the body states the consequence **and what will not change**,
 * and the primary **repeats the verb** — never `OK`, `Yes` or `Confirm`.
 *
 * Structurally `people/ConfirmDialog.tsx`'s `ConfirmRequest` minus its
 * `onConfirm`, because the answer comes back through the promise instead.
 */
export interface CommandConfirmRequest {
  title: string
  body: string
  confirmLabel: string
  /** Present when the domain requires a stated reason. Empty is not submittable. */
  reason?: { label: string; help: string; message: string }
  /**
   * A closed set the operator picks from before confirming — `subscription.freeze`'s
   * duration. The wave-1 note asked for a typed option list rather than a text
   * box parsed into a date, and this is it (X9, T6.1).
   */
  choice?: CommandConfirmChoice
  /**
   * A sum of money the operator sets before confirming — `wallet.credit`'s
   * amount. Structurally `ConfirmMoneyDialog`'s own `amount`
   * (`financials/shared/ConfirmMoneyDialog.tsx:93`) plus the callback `choice`
   * already established, so a host that renders one renders this. **Additive:**
   * `confirm` still resolves the reason or `null`.
   */
  amount?: CommandConfirmAmount
}

/**
 * The money field of a confirm step. **AC-384** — the ceiling bounds the input
 * and the refusal names it; an amount is never silently trimmed, because a
 * quietly reduced credit is worse than a clear refusal.
 */
export interface CommandConfirmAmount {
  /** All three already translated. */
  label: string
  help: string
  message: string
  /** The ceiling, in halalas. The primary stays disabled above it. */
  maxHalalas: number
  /** What the field opens on, in halalas. The operator may change it. */
  initialHalalas: number
  /** The value reaches `run` as it changes — `choice.onSelect`'s shape. */
  onChange(halalas: number): void
}

/** One option of a confirm step's closed set. `ConfirmDialog`'s own shape. */
export interface CommandConfirmOption {
  /** The domain's own token, handed back verbatim. Never translated. */
  value: string
  /** Already translated. */
  label: string
  /** A second line — what choosing this one means. Never the only carrier. */
  hint?: string | null
}

/**
 * Structurally `ConfirmDialog`'s `choice` plus the two fields a command needs,
 * so a host that already renders one renders this. **Additive:** `confirm`
 * still resolves the reason or `null`, so no other registry, host or surface
 * changes; the pick reaches `run` through `onSelect` as the selection moves.
 */
export interface CommandConfirmChoice {
  /** All four already translated. */
  label: string
  help: string
  message: string
  placeholder: string
  options: readonly CommandConfirmOption[]
  /** §11.6 — an empty option list is a sentence, never an empty popover. */
  emptyMessage: string
  /** The option selected when the question opens. Names one of `options`. */
  initial: string
  onSelect(value: string): void
}

/**
 * **The inverse operation, and everything the toast needs to narrate it —
 * D18.**
 *
 * D18's ruling, in the three clauses this shape has to carry: an action is
 * undoable **only when its inverse is already a declared command in the same
 * registry and nothing left the console**; undo runs that inverse **through the
 * data seam as a real, separately audited mutation**, never an optimistic local
 * reversal; and the window is **ten seconds and is exactly the life of the
 * toast offering it**.
 *
 * `run` is therefore `() => Promise<void>` and not a state setter, which the
 * field's original two-line shape already assumed. **The three strings are the
 * addition**, and each answers a clause of D18's toast table that a bare
 * `{ label, run }` had nowhere to put:
 *
 *   - **on success** a *second* toast states the reversal — `Suspension
 *     reverted for Nora Al-Harbi` — and carries **no undo of its own**, because
 *     an undo of an undo is a loop with no floor. That is `doneMessage`.
 *   - **on failure** the toast **becomes critical in place**, states what is
 *     still true, and **leaves the original action's effect on screen** because
 *     it is still the truth. That is `failedMessage`, and it is phrased as a
 *     fact rather than as "something failed" for exactly that reason.
 *   - **after a second failure** the `Try again` is replaced by a link to the
 *     record; the console stops promising something it has failed at twice.
 *     That is `recordLink`.
 *
 * Only the command can write these, because only the command knows the verb,
 * the count and the record — which is the same argument that put the
 * confirmation copy in the command rather than in the dialog.
 */
export interface UndoHandle {
  /** D18: one control, labelled `Undo`. Never an icon, never `Cancel`. Already translated. */
  label: string
  /**
   * The inverse, **through the data seam**. A rejection is a real failure the
   * toast must state — a second operator may have edited the record inside the
   * window, and a local reversal could not have discovered that.
   */
  run(): Promise<void>
  /** R9 — the second toast's line. Names the object. Already translated. */
  doneMessage: string
  /** R9 — what is still true when the inverse did not go through. Already translated. */
  failedMessage: string
  /**
   * Offered only after `Try again` has itself failed. Absent where there is no
   * single record to open — twelve reverted suspensions have no one record, and
   * a link to an arbitrary member of the set would be a guess.
   */
  recordLink?: { label: string; open: () => void }
}

/**
 * What the command tells the surface after it ran.
 *
 * §2: *"`CommandOutcome` carries the toast copy and, where the action is
 * reversible, the undo handle — which is how D8's 'a one-click approve is a
 * one-click irreversible act' gets answered once instead of per screen."*
 *
 * **Generic on the record type**, which is a deviation from the spec's bare
 * `CommandOutcome`: `changed` carries records the host must overlay on what is
 * on screen (the mock clients return the updated row without writing it back —
 * see `people/useRowOverrides.ts`), and typing that array `unknown` would put a
 * cast in a data path on every caller.
 */
export interface CommandOutcome<T = unknown> {
  /** R9 — one line, names the object, no period. Already translated. */
  message: string
  /**
   * The records the command changed, exactly as the client returned them.
   * Never something recomputed here.
   */
  changed?: readonly T[]
  /**
   * **P3-T9 — set when, and only when, D18's mechanical test passes:** the
   * inverse is a declared command in this same registry, **and** nothing left
   * the console — no message to a customer, no money moved, no notification
   * pushed, no third party told.
   *
   * Its presence changes two things beyond the toast. It **buys the command out
   * of its confirm step** (D18: reversibility is the price of skipping the
   * dialog, and there is no third state), and its **absence on an
   * `affordance: 'destructive'` command makes the confirm step mandatory**
   * (P4-T2 enforces that here rather than per screen).
   *
   * `arity: 'needs-input'` is not a counter-example: an input step is not a
   * confirmation. `Suspend captain` still asks for the reason the captain is
   * shown, because `suspendDriver` requires one by contract — it simply stops
   * asking *are you sure*.
   */
  undo?: UndoHandle
}

/** Everything a command is handed when it is asked a question or told to run. */
export interface CommandContext<T = unknown> {
  /**
   * What it acts on. One row from a kebab, the selection from a bulk bar, the
   * pre-seeded target from the palette (§3). Empty for a `global` or `route`
   * command.
   *
   * **A set is not a special case.** `unavailable` and `run` both see the same
   * array whether it holds one record or twelve, which is precisely why the row
   * menu and the bulk bar cannot disagree — there is no single-record code path
   * for them to disagree in.
   */
  targets: readonly T[]
  t: Translate
  language: Language
  session: CommandSession
  host: CommandHost
}

export interface Command<T = unknown> {
  /** Stable, dotted, never translated. The telemetry key and the test handle. */
  id: CommandId
  /**
   * **CM-2 — the ONE label.** Every surface renders `t(command.titleKey)`. A
   * screen that writes the string itself has forked it.
   */
  titleKey: string
  /**
   * §13.4 — the compact form, for a surface that cannot afford five words: the
   * bulk bar's inverted strip and the 88px single-action lane (D8, §7.8).
   *
   * **Not a second label.** It is declared beside the first, in this file's
   * domain registry, so the two cannot drift; the precedent is already in
   * `people/copy.ts`, where `people.action.view` (`View`) exists as the short
   * form of `people.action.viewProfile` (`Open 360° profile`) for exactly this
   * reason. Omit it and the compact surface falls back to `titleKey`.
   */
  compactTitleKey?: string
  section: CommandSection
  /**
   * Synonyms, legacy names, and the **Arabic term**. What makes `deactivate`
   * find `Suspend captain`.
   *
   * **Not translated strings — match tokens.** They are written now, while
   * Arabic is still unreachable (the `AR` dictionary is empty by design), on
   * the plan's explicit instruction: retrofitting synonyms across six
   * registries later is strictly worse than writing them once.
   *
   * Legacy names come from the same vocabulary §5 already resolves
   * destinations by — the route table's `pageAliasIds` and the legacy app's
   * own button labels — so an operator who learnt the old console finds the
   * command by the name it had there.
   */
  keywords: readonly string[]
  icon?: LucideIcon
  scope: CommandScope
  /**
   * §11.2 — **never hidden, disabled in place with this reason.**
   *
   * Returns the **translated sentence** explaining the refusal, or `null` when
   * the command is available. Evaluated at RENDER, not at commit (`:10237` is
   * the systemic legacy defect of checking at commit).
   *
   * **CQ-7:** domain state only. A role question goes through `roleRefusal`,
   * which is the one place that reads `ctx.session`.
   *
   * **Over a set**, the reading is strict: refuse if **any** target would be
   * refused on its own row. The alternative — running on the eligible subset —
   * silently drops records the operator selected, and the alternative to that —
   * refusing only when every target is ineligible — lets the bulk bar act on a
   * record the row menu refuses, which is the exact bug C-1 exists to remove.
   * Each command spells this out in its own predicate, because the count is
   * what the sentence has to name.
   */
  unavailable?(ctx: CommandContext<T>): string | null
  /** D8 — how it renders when it is a row action. */
  affordance: CommandAffordance
  /** §3 — whether it needs a target picked, input typed, or nothing. */
  arity: CommandArity
  /**
   * **CM-4** — why this id is not in the palette. Every command either appears
   * there or says here, in a sentence, why it does not. Absence with no stated
   * reason is how an action ends up mouse-only.
   */
  hiddenFromPalette?: string
  /**
   * **CQ-4** — the only way a command mutates anything.
   *
   * Returns the outcome to toast, or `null` when the operator backed out of the
   * confirmation, or nothing at all when the command only navigated.
   */
  run(ctx: CommandContext<T>): void | Promise<CommandOutcome<T> | null>
}

/** A domain's commands, in the order the row menu renders them. */
export type CommandRegistry<T> = readonly Command<T>[]

/* ────────────────────────── the role seam (Q4) ────────────────────────── */

/**
 * **The one place in the command system that reads a role — CQ-7 / Q4.**
 *
 * `permission` is recorded, **not evaluated**. Every route-table row carries
 * `permission: null` and `session.subTabPermissions` is `{}`, so there is
 * nothing to evaluate it against; what exists is the single `canWrite` boolean
 * a screen computes from the legacy permission list. Naming the permission at
 * every call site now means that when **D4 / Q4** closes, the fix is this
 * function's body plus a field on `CommandSession` — a data change, not a sweep
 * through six domain registries.
 *
 * @param permission the permission this command will require once Q4 lands.
 *                   Documentation today, a lookup key tomorrow.
 * @param reasonKey  §11.2's sentence. Never a bare `false`.
 */
export function roleRefusal<T>(
  ctx: CommandContext<T>,
  permission: string,
  reasonKey: string,
): string | null {
  void permission
  return ctx.session.canWrite ? null : ctx.t(reasonKey)
}

/* ────────────────────────────── the resolver ────────────────────────────── */

/**
 * What a surface knows about itself when it asks for its commands.
 *
 * Every field is optional and every omission means "do not constrain on this",
 * so the palette at rest can ask for everything by passing `{}`.
 */
export interface CommandScopeQuery {
  /** The route the operator is on. Matches `scope.kind === 'route'`. */
  subTabId?: string | null
  /** The kind of record targeted. Matches `scope.kind === 'entity'`. */
  entityType?: ProfileEntityType | null
  /**
   * `true` when the surface acts over a **set** — the bulk bar, or a palette
   * target that is a selection. A plural surface is offered only the commands
   * that declared `plural: true`; a singular surface is offered both, because a
   * command that works over twelve records works over one.
   */
  plural?: boolean
}

/** Does this one command apply to this context? Exported for the tests. */
export function commandApplies<T>(command: Command<T>, query: CommandScopeQuery): boolean {
  const scope = command.scope
  switch (scope.kind) {
    /* Global commands are always offered. `Switch to Arabic` does not care
       which route the operator is on. */
    case 'global':
      return true
    case 'route':
      return scope.subTabId === query.subTabId
    case 'entity':
      if (scope.entityType !== query.entityType) return false
      /* The asymmetry is deliberate — see `CommandScopeQuery.plural`. */
      return scope.plural || query.plural !== true
  }
}

/**
 * **The answer to "which commands apply here", for all four surfaces.**
 *
 * `CaptainsView` calls this twice — once with `plural: false` for the row
 * kebab and once with `plural: true` for the bulk bar — and that is the whole
 * of CM-1: the screen chooses a scope, not a list of actions.
 *
 * Declaration order is preserved, because the row menu's order is a design
 * decision recorded in the domain registry and re-sorting it here would move
 * that decision somewhere nobody is reading.
 */
export function resolveCommands<T>(
  commands: CommandRegistry<T>,
  query: CommandScopeQuery,
): CommandRegistry<T> {
  return commands.filter((command) => commandApplies(command, query))
}

/** By id, for a surface that names one command — a page-header overflow item. */
export function commandById<T>(
  commands: CommandRegistry<T>,
  id: CommandId,
): Command<T> | undefined {
  return commands.find((command) => command.id === id)
}

/**
 * **CM-4** — the commands the palette offers. The complement is exactly the set
 * that declared `hiddenFromPalette`, and the test asserts the reason is a real
 * sentence rather than an empty string standing in for `true`.
 */
export function paletteCommands<T>(commands: CommandRegistry<T>): CommandRegistry<T> {
  return commands.filter((command) => command.hiddenFromPalette === undefined)
}

/* ───────────────────────── evaluation and dispatch ───────────────────────── */

/**
 * **CM-3 — the single evaluation path.**
 *
 * The row kebab, the bulk bar and (from C-2) the palette all ask this one
 * function, with contexts that differ only in `targets`. There is no per-surface
 * predicate to fall out of step, which is what the four-way duplication was.
 *
 * A command with no `unavailable` is always available; that is not a special
 * case, it is the absence of a constraint.
 */
export function unavailableReason<T>(command: Command<T>, ctx: CommandContext<T>): string | null {
  return command.unavailable?.(ctx) ?? null
}

/**
 * What happened, for a surface that has to say something about it.
 *
 * `refused` exists because not every surface **can** render a disabled control
 * with a reason. The row kebab can and does (`rowActions.tsx`); `DataTable`'s
 * `BulkAction` is `{ label, onClick }` with no field for either, so the bulk
 * bar's only way to honour §11.2 today is to state the refusal after the click.
 * That is weaker than gating at render and it is recorded as such in the
 * handoff — the fix is a `disabled` / `reason` pair on `BulkAction`, in a file
 * this task does not own. It is still strictly better than the alternative it
 * replaces, which was performing the action the row menu refuses.
 */
export type CommandResult<T> =
  | { kind: 'ran'; outcome: CommandOutcome<T> | null }
  | { kind: 'cancelled' }
  | { kind: 'refused'; reason: string }

/**
 * **The single dispatch path — CQ-4.**
 *
 * Every surface runs a command through here, so the refusal is checked once
 * more immediately before the write (a backstop, not the gate — the gate is at
 * render), and `run` is reached by exactly one route no matter which surface
 * the operator used.
 *
 * A refusal with no sentence still refuses: `unavailable` returning a string is
 * the contract, and a command that returns `''` gets a `refused` result the
 * caller can still act on.
 */
export async function runCommand<T>(
  command: Command<T>,
  ctx: CommandContext<T>,
): Promise<CommandResult<T>> {
  const reason = unavailableReason(command, ctx)
  if (reason !== null) return { kind: 'refused', reason }

  const outcome = await command.run(ctx)
  if (outcome === undefined) return { kind: 'ran', outcome: null }
  if (outcome === null) return { kind: 'cancelled' }
  return { kind: 'ran', outcome }
}
