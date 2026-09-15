# Alerting v2 — accessibility audit (WP-5.7 Proof)

**Scope** Keyboard, focus, accessible names, contrast, per `docs/ref/a11y.md`. Method: the
checklist there ("Tab through the whole screen without touching the mouse. If you lose the
focus ring, or you cannot reach a row action, stop there.") plus a computed-colour scan and
a code read of every `outline-none` in the alert-owning files.

**Fresh checks this session**, live against `npx vite --port 4327`:
`scripts/harness/alerts-v2-proof.mjs` Checks 4 and 5, plus a manual code read of every
focus-ring pairing in the alert-owning components.

---

## Focus ring — `outline-none` pairing (§7.2)

Grepped every `outline-none` in `src/screens/reports/AlertRuleDialog.tsx`,
`AlertsView.tsx`, `AlertFeedView.tsx`, `AlertHistoryDialog.tsx`,
`AlertPreviewChart.tsx`, `AlertStatusBlockView.tsx`: **4 occurrences, all 4 paired** with
`focus-visible:ring-2 focus-visible:ring-ring` on the same class string
(`AlertRuleDialog.tsx:882,1020`, `AlertsView.tsx:617`, `AlertFeedView.tsx:245`). No bare
`outline-none` found. ✅

## Icon-only buttons have an accessible name (§ checklist)

- The G15 bell: `aria-label={t('rb.toolbar.createAlert')}` (`ChartToolbar.tsx:295`) — read
  live as "Create alert from this chart", confirmed reachable by `getByRole('button', {
  name: 'Create alert from this chart' })` in the harness.
- The page block's menu trigger: `aria-label={t('pg.edit.blockMenu', { name })}` — reads
  "More actions for {block name}", confirmed live (`BlockFrame.tsx:107`).
- Label-remove buttons in the composer: `aria-label={t('rb.alert.form.labels.remove', {
  name: label })}` (`AlertRuleDialog.tsx:881`).

## Colour is never the only carrier of meaning (§7.5)

Every rule state on the Rules table carries both a tone **and** a glyph
(`AlertsView.tsx:79-85`, `STATE_GLYPH`) plus the state word itself via `StatusBadge`'s
children — never tone alone. Confirmed by code read; not independently screen-reader-tested
this session (see Coverage gaps).

## No red badge / contrast (docs/ref/a11y.md's required ratios)

Live computed-colour scan (Check 4, `alerts-v2-proof.mjs`), walking every element's resolved
`color`/`background-color`/`border-color`/`fill`/`stroke` on both the Rules tab (including
the seeded `firing` row) and the Firings tab: **zero** elements with a saturated red
(`r > 150` and `r` dominant over both `g` and `b` by more than 60). This is the same
"substitute `--muted` for `--ghost`" failure class `docs/ref/a11y.md` names as the most
common defect; none of that legacy token appears in the alert files either (grepped, zero
hits for `--ghost`/`.hint`).

**Not measured**: exact contrast ratios (e.g. the 4.5:1 body-text floor) for every text/
background pairing on the alerts screens — the red scan proves the *hue* failure mode
`docs/ref/a11y.md` calls out by name, not the full ratio table. A proper per-pair ratio sweep
is visual-qa-engineer/design-token-steward territory and was not run here.

## Keyboard — a real defect found

### `Escape` does not close the composer

**Reproduction:** `/management/reports/RPT-3` → focus the bell (`Tab` or
`page.focus()`) → `Enter` (opens the composer, confirmed: the `Name` field is present) →
move focus into the panel (e.g. the `Name` field, a realistic keyboard path that tabs in
before trying to leave) → `Escape`.

**Expected:** the panel closes and focus returns to the trigger — the QA charter's own
"Escape closes the modal" keyboard path, and the behaviour a native `Dialog`/`AlertDialog`
gives for free. `AlertRuleDialog` deliberately opts out of `role="dialog"` (the owner's
no-dialog ruling, correctly implemented per AC-1225), but that also means it opts out of
Radix's built-in `Escape`-to-close — and nothing in the component re-implements it.

**Actual:** `Escape` does nothing. The `Name` field (and every other field) stays exactly as
it was; `document.activeElement` after the key press is still the same `<input
id="rb-alert-name">`. Confirmed by code read: **zero** `Escape`/`keydown` handling anywhere in
`AlertRuleDialog.tsx` (the file's one `onKeyDown` is on the labels-input field, for `Enter`
to commit a label — unrelated).

**There is a way out, but it costs 16 Tab presses.** A visible `Cancel` button exists
(`AlertRuleDialog.tsx:943-944`, `onClick={() => onOpenChange(false)}`) and is keyboard-
reachable — the harness measured **16** `Tab` presses from the `Name` field to reach it
(Check 5, `tabsToCancel: 16`). The composer is not a keyboard trap (a way out exists), but it
is the long way round for a panel with no `Escape` shortcut.

**Severity: should-fix.** Not blocking, because a keyboard path to close does exist and the
panel does not trap focus — but 16 Tab presses to back out of a panel opened by mistake, with
no `Escape` shortcut at all, is a real cost to a keyboard-only or screen-reader operator, and
it is the specific "Escape closes the modal" path this role's own charter names as required
testing. Same finding likely applies to the unsaved-report inline name prompt
(`ReportBuilder.tsx:1627-1670`) and to `MuteMenu`'s inline menu — not independently checked
this session (see Coverage gaps), but they share the same "inline panel, not `Dialog`" pattern
and the same risk.

**Suggested owner:** frontend-engineer — a `useEffect` listening for `Escape` while `open` is
true, calling `onOpenChange(false)`, would close this gap without reversing the no-dialog
ruling (the panel still carries no `role="dialog"`; it just also responds to the one key
every other dismissible surface in the product responds to).

## Keyboard — confirmed working

- **Tab reaches the bell**, and **Enter activates it** exactly like a click (Check 5,
  `composerOpen: true` after `Enter` on the focused button — a real `<Button>`, not a
  `div onClick`, per `ChartToolbar.tsx:291-298`).
- **The inline unsaved-report name prompt carries no dialog role** (`role="dialog"` count:
  0 while it is open) — confirmed live, so a screen-reader user is not told they are in a
  modal when they are not.
- **The three G15 entry points are all keyboard-reachable**: the toolbar bell (a `<Button>`),
  the page block's `More actions for…` menu → `Create alert…` (a real `DropdownMenuItem`,
  `role="menuitem"`, reached and activated via `getByRole` in the harness without any
  fallback to coordinates or class names), and — implicitly, since it is the same
  `AlertRuleDialog` — the library row's own action.

## Coverage gaps

- **Screen-reader announcement** (NVDA/VoiceOver) of the composer opening, the segmented
  condition-kind control's state, and the no-baseline refusal sentence was not tested with an
  actual assistive-technology tool this session — only DOM structure (roles, labels,
  `aria-pressed`/`aria-describedby` wiring) was read and exercised via Playwright's
  accessibility-tree-aware locators. A real screen-reader pass is not something this harness
  proves.
- **The `Escape`-does-not-close finding was checked only on the builder-bell entry point.**
  The unsaved-report name prompt and the page-block-menu composer were not independently
  re-tested for the same gap this session, though code inspection of
  `ReportBuilder.tsx:1627-1670` (the name prompt) shows the same absence of any `Escape`
  handler, making it likely to share the defect. Flagging as a probable duplicate, not a
  confirmed second instance.
- **Full per-pair contrast ratio measurement** (the 4.5:1 body-text floor, the 3:1
  interactive-boundary floor from `docs/ref/a11y.md`) across every alerts surface was not
  run; the red-hue scan is a narrower, complementary check, not a substitute.
- **`MuteMenu`'s inline menu keyboard path** (arrow-key navigation between the five duration
  options, `Escape` behaviour) was not independently tested this session — `alerts-v2.test.tsx`
  covers the `Mute for 1 hour` happy path with `userEvent`, which does exercise real keyboard
  events under Testing Library, but a live-browser confirmation was not added to the proof
  harness.
