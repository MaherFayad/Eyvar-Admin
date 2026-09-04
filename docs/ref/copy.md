# UX writing

Source: `DESIGN.md` §5.7. These are MUSTs.

## Rules

1. **Sentence case** everywhere — labels, titles, buttons, messages. Only proper nouns and
   product names capitalised mid-string.
2. **Buttons are verbs** (or verb + object). The only permitted non-verb labels: `Cancel`,
   `Close`, `Done`, `Save`, `Discard`.
3. **No exclamation marks, no emoji, no "successfully"** in system copy.
4. **Errors are imperatives that name the fix.** No "please", no "invalid", no "failed", no
   blame.
5. **Echo the object exactly** — the toast or banner names the same thing the button named.
6. **"you" and "your"** — address the operator directly.
7. **Constraints go in helper text under the field**, never in a tooltip.
8. **No period** ending a toast, tooltip, badge, or menu item. Banner and helper
   *sentences* do take one. (R6)
   **An inline field error is a sentence and takes one** — `Enter a valid email address.`
   R6 is a ruling and beats this file; the row below was missing the period and is
   corrected. `00-shell.md` §10.4's own example (`Enter a discount between 0 and 100.`)
   always carried it.
9. **Destructive confirmations say what will *not* change**, alongside what will.
10. **State end-of-list and no-data in words** rather than leaving a surface blank.
11. **"Learn more about `<noun>`"** for page-level help, only the noun linked; a bare
    "Learn more" appended inline elsewhere.
12. **No em dash.** `·` separates a qualifier, two clauses become two sentences, and the
    en dash is for numeric ranges only (`Showing 1–7 of 7`). X14.

## Rewrites

| Don't | Do |
|---|---|
| `Driver Successfully Updated!` | `Driver updated` |
| `Invalid email` | `Enter a valid email address.` |
| `Please try again later` | `Try again` |
| `Something went wrong` | `Couldn't load drivers. Try again.` |
| `Are you sure?` | `Archive 3 drivers?` |
| `OK` | `Archive drivers` |
| `Submit` | `Send invoice` |
| `No data` | `No drivers match these filters` |
| `⚠️ Wallet low` | `Wallet balance below minimum` |
| `Offered to Nora — waiting for their reply` | `Offered to Nora · waiting for their reply` |
| `Assumed — not confirmed` | `Assumed. Not confirmed.` |

## How many words (X18)

Every slot an operator scans has a budget. Anything longer moves behind `InfoHint` or onto
the record's own detail surface. `npm run i18n:keys` counts them, puts each key in a class
by its name, and holds the over-budget total as a ceiling it refuses to raise.

| Slot | Words | The key looks like |
|---|---:|---|
| Page or card title | 4 | `…title`, `…heading`, `route.…`, `nav.…` |
| Button | 3 | `…action.<verb>`, `…empty.action` |
| Badge | 2 | `…status.<enum>` |
| Meta line | 6 | `…meta`, `…meta.…` |
| Cell second line | 5 | no convention yet; give it a `.sub` tail |
| Empty-state title | 5 | `…empty.…heading` |
| Empty-state body, one sentence | 12 | `…empty`, `…empty.…body` |
| Banner, with one action | 20 | `…banner.…` |
| Toast | 8 | `…toast.…` |
| Tooltip | 25 | `…hint`, `…hint.…`, `…tooltip…` |

A placeholder counts as one word. A refusal sentence under `action.` is not a button and
has no budget; it is still bound by rule 4.

## What goes behind an info icon (X15)

`InfoHint` is the tooltip, and it is not a place to put things an operator must read.

- A sentence that **explains** goes behind `InfoHint`, beside the thing it explains: what a
  measure counts, what a threshold means, why a column is empty.
- A sentence that **changes what the operator does next** stays inline: a refusal (§11.2), a
  field error, the one line of an empty state, a banner's body.
- **Nothing an operator must read to act may live only in a tooltip.** A tooltip is not
  reachable on touch, is not announced reliably, and disappears on the way to the control.

The test: if the sentence were deleted, would the operator take a different action? If yes,
it is inline. If it would only leave them less sure why, it is an `InfoHint`.

## Toast, specifically (R9)

One line. Names the object exactly. ≤60 characters. No period, no emoji, no action link.
If the object name is long, truncate the **object** with an ellipsis — never the verb.

`Plan "Weekly · Riyadh North…" saved` · not · `Changes saved successfully!`

## Arabic (§9.6)

Sentence case does not exist in Arabic — rule 1 simply does not apply. Arabic comma `،` and
question mark `؟`. Button labels stay verb-first. Never build a string by concatenation:
it cannot be translated and it breaks under bidi.
