# The analyst screen — accessibility audit (WP-7.7 Proof)

**Scope** Keyboard use, focus, accessible names, contrast, per `docs/ref/a11y.md`'s checklist
("Tab through the whole screen without touching the mouse. If you lose the focus ring, or you
cannot reach a row action, stop there.").

**Method this session**: a code read of every `outline-none` in the analyst-owning files, plus
live keyboard-driving Playwright checks against an isolated `npx vite --port 4329` (the harness
default `:4327` was already serving another agent's session on this shared tree — see the qa
doc). Scratch scripts used to drive the checks were deleted after use; the exact steps are
reproduced below so the checks can be rerun.

---

## Focus ring — `outline-none` pairing (§7.2)

Grepped every `outline-none` across `src/screens/analyst/*.tsx`: **one occurrence**
(`ProvenancePanel.tsx:64`), paired with `focus-visible:ring-2 focus-visible:ring-ring
focus-visible:ring-offset-2` on the same class string. No bare `outline-none` anywhere in the
screen. Live-confirmed on that exact link: focused the "Open in builder" anchor and read its
computed style — `outlineStyle: none` but `boxShadow !== 'none'` (the ring is drawn via
`box-shadow`, Tailwind's ring mechanism) — a real, visible focus indicator, not an invisible
one.

Every other interactive element in the screen (`Button`, `Textarea`, `Input`, `Switch`,
`DropdownMenuItem`, `CommandItem`, `TabsTrigger`) is a shadcn primitive already carrying the
product's shared `focus-visible:ring-*` treatment; none of the analyst files override it.

## Keyboard — the whole composer flow, driven live, no mouse

Reproduction: `/management/reports?view=analyst`, focus the `Question` textarea directly
(`page.getByRole('textbox', { name: 'Question', exact: true })`), type a question, then press
`Tab` repeatedly.

**Result: reached `Ask` in 3 Tab hops, `Enter` activated it exactly like a click** — a new job
was created (`AGT-87`) and the browser navigated to its job page
(`/management/reports/analyst/AGT-87`). The whole "type a question, submit" path needs no
mouse. `Ask` is a real `<Button type="button">` (`AskComposer.tsx:229`), not a `div onClick`.

**A query artifact worth recording, not a defect**: an early, looser check
(`getByRole('textbox', { name: 'Question' })`, no `exact: true`) resolved to **two** elements —
the real `Question` textarea and the index table's search input, because its accessible name
is `"Search questions"` (`an.index.search` in `copy.ts:24`) and Playwright's default name
match is substring/case-insensitive, so `"Question"` matched inside `"questions"`. Re-run with
`exact: true` and the flow above is unambiguous. Recorded so the next session driving this
screen by role name does not mistake this for a duplicate-labelling defect.

## Keyboard — the timeline's `Collapsible`

`AGT-1`'s "Show steps" trigger: focused directly, `Enter` pressed. **8 step rows appeared**
inside the `role="log"` list (matching `agentEventFixtures[DONE_JOB_ID]`'s 8 events exactly) —
the native `CollapsibleTrigger` behaviour works with no custom key handling needed, because
this is a real `Button` wrapped in Radix's `Collapsible`, not a bespoke widget.

## Row actions are real `<button>`s, not a clickable `<tr>`

The index table's row-open action (`rowActions: [{ label: 'Open', onSelect: openJob, rowClick:
true }]`, `AnalystView.tsx:182`) is **not** implemented as an `onclick` on the `<tr>` itself.
Live: `document.querySelector('table tbody tr')` has no `role`, no `onclick` attribute, and
**does** contain a real `<button>` — `hasButtonInside: true, hasLinkInside: false, onclickAttr:
null`. `rowClick: true` is `DataTable`'s own convention for "the whole row is also a click
target for this action," layered on top of, not instead of, a real button — satisfies rule 5
("clickable things are `<button>` or `<a>`") either way the row is activated.

## Icon-only controls have accessible names

- The attach-chip remove button: `aria-label={t('an.compose.attach.remove', { name:
  chipLabel(each) })}` (`AskComposer.tsx:144`) and the identical pattern in
  `SchedulesPanel.tsx:140` — reads as "Remove {report name}", not a bare "×".
- The pagination chevrons on the shared `PageHeader` (used by both the index and the job page)
  carry `aria-label={t('table.previous')}` / `t('table.next')` (`PageHeader.tsx:302-313`).
- Every action on the job page (`Copy link`, `Re-run`, `Save as page`, the disabled `Pin to
  page…`/`Create alert`) has **visible text**, not an icon standing alone — no `aria-label`
  needed, and none of them rely on a tooltip as the only name source.

## Disabled-with-reason is announced, not just visually shown

`Pin to page…` and `Create alert` (`JobScreen.tsx:245-258`) pass `disabled: true, reason:
t(...)` into `PageHeader`'s `overflowActions`, which wires `aria-describedby={describedBy(...)}`
onto the `<Button>` (`PageHeader.tsx:292`) pointing at the reason text — a screen-reader user
tabbing to the disabled button hears why, not just that it does nothing. Confirmed by code
read; not independently re-tested with a screen reader this session (see Coverage gaps).

## Colour is never the only carrier of meaning

Every job-state badge carries the state word itself as visible text (`Badge`'s children,
`t('an.job.state.<state>')`) alongside its tone — never tone alone. The runner-status line
(`RunnerStatusLine`, `AnalystView.tsx:60-85`) pairs a coloured dot with a full sentence
("Runner online · last seen 12:03"), and the dot is `aria-hidden="true"` — the sentence, not
the dot's colour, is what a screen reader announces.

## `role="log"` and live updates

`JobTimeline.tsx:75`'s `StepList` sets `aria-live={running ? 'polite' : 'off'}` on the
`role="log"` list — live only while a job is actually running, `off` once terminal (`done`,
`failed`, `deferred` all pass `running={false}`), so a screen-reader user does not get
interrupted by a step list that will never change again. Live-confirmed this session on
`AGT-2` (running): `hasLog: true, ariaLive: "polite"`.

## No red — the accessibility half of R7

The computed-colour scan (visual doc, `scanForRed()`) found **zero** saturated-red elements
across all seven seeded job states — the same "substitute `--muted` for `--ghost`" failure
class `docs/ref/a11y.md` names as the most common defect does not appear here; no legacy
`--ghost`/`.hint` token found in the analyst files either (grepped, zero hits).

## Coverage gaps

- **Screen-reader announcement** of the live timeline actually updating, the runner-status
  line's polite region, and the disabled-button `aria-describedby` reason was not tested with
  an actual assistive-technology tool this session — DOM structure and Playwright's
  accessibility-tree-aware locators were exercised, not a real screen reader.
- **Full per-pair contrast ratios** (the 4.5:1 body-text / 3:1 interactive-boundary floors from
  `docs/ref/a11y.md`) were not measured across the analyst screens; the red-hue scan is a
  narrower, complementary check (same scope note as the visual doc).
- **The `Attach` popover's own keyboard path** (arrow-key navigation inside the `Command` list,
  `Escape` to close) was reached and its 21 options counted live, but arrow-key traversal and
  `Escape`-close were not independently driven this session — `Command`/`Popover` are Radix
  primitives with built-in keyboard support, not bespoke code, so the risk here is lower than
  for a hand-rolled widget, but it was not proven live.
- **The Schedules tab's keyboard path** (day segmented control, the time `<input type="time">`,
  the enable/disable `Switch` rows) was read and typechecked, not driven live this session.
- **`limitedUntil`'s runner-status announcement** (the third branch, "At usage limit until …")
  was read only, not exercised live or with a screen reader — same gap the qa doc names.
