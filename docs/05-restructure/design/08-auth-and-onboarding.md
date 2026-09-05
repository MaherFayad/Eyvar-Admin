# 08 — Authentication and onboarding

> **Owner:** product-designer. **Design spec.** Implements `specs/04-auth-and-onboarding.md`
> (**AC-500 – AC-681**) against `DESIGN.md`, `DECISIONS.md` **D7** / **D14**, and my own
> `design/07-rulings-r4.md` **R4-2** (the auth-card row + the fifth page shape) and **R4-3**
> (four shell layers; re-authentication is a modal).
>
> **Consumers:** **frontend-engineer** (§2–§10, §13 — every screen and the freeze contract) ·
> **utilities-engineer** (§9.1's freeze helper, §4.4's cooldown ticker, §11's plural keys) ·
> **mock-data-engineer** (§10's device rows, §10.5's 21 fixture steps) ·
> **product-owner** (§15 — seven spec overrules, each with its clause; two conceded in §15.1).
>
> >
> **Rulings applied:** R1 · R2 · R3 · R5a · R6 · R7 · R8 · R9 · R10 · R13 · R15 · R16 · R17 · R19
> (checked and *not* spent) · **R4-2** · **R4-3**.
> **Decisions applied:** D1 · D2 · D5 · D7 · D8 · D14 · D-9 · D-11 · D15.
> **D-2 is retired** (D7) and is cited nowhere.
>
> **No new owner signature is requested.** Three are already outstanding
> (`DECISIONS.md` — §6.2 D-12, R15 scope, §6.2 D-13, D15). Nothing here is load-bearing enough
> to add a fourth. Two things needing *someone's* attention are in **§16 Findings** instead,
> and neither blocks a build.
>
> **`TODO` count: zero.** Every string in this document is final.

---

## 0. What this settles, in one screen

| # | Question the spec left to me | Ruling |
|---|---|---|
| 1 | D14's §2.5 D split — confirm or correct | **Confirmed**, with the three corrections already in R4-2 §2.1, **plus two more** (§1.3): the field order moves `Forgot password?` above the primary, and the legal row renders only links that exist |
| 2 | Is a failed sign-in one of R5a's four reds? | **Yes — use #2**, the one page-level critical banner. On an auth card the card *is* the page. No fifth use is spent (§2.4) |
| 3 | OTP: per-digit or single input | **Single input.** Seven reasons, §4.1. This retires half of R4-2's own 400 px arithmetic and I say so |
| 4 | OTP paste, auto-submit, auto-advance | Paste fills and **moves focus to the primary without submitting**; typing the 6th digit moves nothing (§4.1 D-OTP-4) |
| 5 | The 3rd and 5th wrong attempt | Five distinct strings, three tones, and **the tone tells the operator whether the attempt counted** (§4.3) |
| 6 | Resend cooldown copy while counting | `Resend code in 27s`, full-width secondary, **`aria-live="off"` on the ticking number** (§4.4) |
| 7 | Session dies mid-form | Freeze, don't unmount. `readOnly` not `disabled`. One modal, `alert-dialog`, no identifier field. Sign-out-from-the-modal swaps in place rather than nesting (§9) |
| 8 | The idle warning vs an existing banner | The countdown **takes the shell slot outright** and restores what it displaced. Still one banner, so R10 holds (§9.5) |
| 9 | The four onboarding tracks | Layer at `?onboarding=1`, §5.6 anatomy, 21 steps with final titles and bodies (§10.5) |
| 10 | Dismiss / skip / resume / restart / role change | §10.4. **No confirm modal on any of them** — §5.5 forbids a modal inside a no-scrim layer, and that clause decides it |
| 11 | The non-committal reset confirmation | §7.2. `info` tone, **not** the reference's green ✓, because success asserts a thing we refuse to assert |

---

## 1. Pattern, precedence, and the reference split

### 1.1 The §6.4 rows, already minted

| Screens | Pattern row (R4-2) | Page shape |
|---|---|---|
| `signin` `signin-verify` `signin-enroll` `forgot-password` `reset-password` `set-password` | **Auth card** — §2.5 D (structure only, D14), §4.2–4.4, §5.2 | **Shape 5 — centred card, no frame.** Card **400 px** fixed |
| `onboarding` | **Guided checklist** — §5.6, in a shell layer (§5.5, no scrim) | No new shape. A layer is not a page |
| `reauthenticate` | **Not a layer.** `alert-dialog` modal, 440 px (R4-3) | — |

F-1 and F-2 are closed. Nothing in this document is designed without a row.

### 1.2 Precedence, stated once so no argument reopens

A MUST in `DESIGN.md` §1–§5 describes the **inherited baseline**, not Eyvar. What binds here is the Rulings
table, §6.2's sanctioned deviations, §7–§9, and `DECISIONS.md`. **R13 voids every pixel figure
in §1–§5**, so no measurement below is justified by one. Every number cites a token, a ruling,
or is marked `[originated]`.

### 1.3 D14's §2.5 D split — checked clause by clause, and where I disagree

The spec's §3.4 table is right and I have not redone it. R4-2 §2.1 already corrected three
clauses (width/radius/padding as real numbers; the ground; the card's elevation tier). **Two
further corrections, both mine, both new:**

| §2.5 D clause | Spec §3.4 / AC-503 said | **My ruling** |
|---|---|---|
| *"field order: identity → primary action → alternates → …"*, and AC-503's explicit order | `Forgot password?` sits **after** the full-width primary | **Overruled. It sits directly under the password field, above the primary.** Two frames show it there unambiguously — the inherited captures — and D14 sends card order to the inherited flow. The product reason is stronger than the reference one: `Forgot password?` is an escape from *the password*, not from the card, and it is the control an operator reaches for in the second after the primary just failed. Below the primary it reads as an afterthought and sits under the fold a banner re-render pushes down. **Overrules AC-503; rewrite in §15** |
| *"small legal links (`Help Privacy Terms`) at the card's bottom-left"* | *"Kept as a slot, filled from Admin › Workspace's `legal` pane"* | **Kept as a slot, and the slot renders only links the pane actually provides.** Eyvar has no help centre, so `Help` is not rendered. **When the pane provides none, the row is not rendered at all** — no empty row, no dead link. A dead `Help` on a sign-in page is worse than no `Help`. Restated logically: bottom **inline-start**, not bottom-left |

Everything else in §3.4 stands: content order kept, full-width primary kept, no gradient, no
providers, no sign-up switch, no `~475/16/34` numbers.

**One §2.5 Rules-block clause is void for Eyvar** and R4-2 already struck it in the partial:
*"…MUST place provider buttons in a single equal-width row beneath an `or` divider."* No
providers exist. A MUST with no referent is how someone later justifies adding one.

---

## 2. The auth card — one anatomy, six screens

### 2.1 Ground and card

| Part | Value | Source |
|---|---|---|
| Ground | `--ev-bg2` `#f6f8f9`, flat, full-bleed | R4-2 §2.1. No gradient, no image, no second skin |
| Card width | **400 px**, fixed, never fluid | R4-2 §2.1 |
| Card surface | `--ev-surface`, `--ev-hairline` border, `--ev-radius-card` (8 px), **`--ev-shadow-2`** | R4-2 §2.1; tier 2 pre-assigned in `00-decisions-r3.md` §1.2 |
| Card padding | **32 px** all round → 336 px content column | R4-2 §2.1, on the 4 px grid |
| Position | Horizontally and vertically centred in the viewport | §2.5 D, kept |
| Short viewport | When the viewport is shorter than `card height + 96 px`, the ground scrolls and the card takes **48 px block padding**, top-aligned. It never clips and never centres itself off-screen | `[originated]` |
| Chrome | **None.** No rail, no sub-tab column, no top bar, no shell banner strip, no toast region | AC-500 |

There is **no toast on any auth screen.** There is no shell to host one, and every event here is
either a standing condition (banner) or a field problem (inline). Recorded because `sonner` is
globally mounted in the app shell and an engineer will reach for it.

### 2.2 The content stack

```
   ┌─ 400 ───────────────────────────────────────────────┐  --ev-surface
   │  32                                                 │  --ev-hairline, r8, shadow-2
   │   ▣ Eyvar                                           │  wordmark   24px mark + 15/600
   │                                                     │  24
   │   Sign in                                           │  h1         22/28  --text-xl
   │   Eyvar operations console                          │  subtitle   13/20  --ev-text-2
   │                                                     │  20
   │   ┌───────────────────────────────────────────────┐ │
   │   │  BANNER SLOT — at most one, ever              │ │  §2.3
   │   └───────────────────────────────────────────────┘ │
   │                                                     │  16
   │   Email                                             │  label      13/400 --ev-ink
   │   ┌───────────────────────────────────────────────┐ │  field      40px  --ev-control-h-lg
   │   │                                               │ │
   │   └───────────────────────────────────────────────┘ │
   │                                                     │  12
   │   Password                                          │
   │   ┌─────────────────────────────────────────┬─────┐ │
   │   │                                         │  ◉  │ │  reveal, 32px hit, inline-end
   │   └─────────────────────────────────────────┴─────┘ │
   │   Forgot password?                                  │  13px --ev-blue-dk + underline (R3)
   │                                                     │  12
   │   ☐  Remember this device                           │  checkbox 16px, label 13/400
   │                                                     │  20
   │   ┌───────────────────────────────────────────────┐ │
   │   │                  Sign in                      │ │  full-width primary, 40px
   │   └───────────────────────────────────────────────┘ │  bg-primary = --ev-ink (D7 §1.8)
   │                                                     │  24
   │   Privacy   Terms                                   │  12px --ev-text-2, inline-start
   │  32                                                 │
   └─────────────────────────────────────────────────────┘
```

| Rule | Spec |
|---|---|
| Wordmark | `<AuthWordmark>` — the existing `EyvarMark` at **24 px** + the word `Eyvar` at `--text-base` 15/600 `--ev-ink`, 8 px gap. **New composition, frontend-engineer.** The mark glyph does not mirror (`rtl.md`, logos); the **pair** sits at the card's inline-start in both languages |
| h1 | `--text-xl` (22/28), `--ev-ink`, 600. Exactly one `<h1>` per card, and it is the accessible name of the surface |
| Subtitle | 13/20 `--ev-text-2`. A **fragment**, no period (R6), except where it is a sentence and then it takes one |
| Field height | **`--ev-control-h-lg` 40 px**, not the 32 px compact control. This is the token's declared job (*"one 8 px step above the compact control"*, `03-visual-language.md` §1.4) and its **first consumer**. Density is a console decision for a screen holding forty controls; this card holds two. §4.2's *one field height per surface* is honoured — every field on the card is 40 |
| Primary | `--ev-control-h-lg`, **full width** (§2.5 D, kept), `bg-primary` = `--ev-ink` under D7 §1.8. One primary per card, always |
| Reveal control | `input-group` trailing button, 32 px hit target inside the 40 px field, accessible name `Show password` / `Hide password`, keyboard-operable, `type="button"` so `Enter` never toggles it (**AC-510**) |
| Autocomplete | `email` `current-password` `new-password` `one-time-code` on the four field kinds. A password manager must fill this card without help (**AC-679**) |
| Legal row | 12 px `--ev-text-2`, links `--ev-blue-dk` + underline (R3), 16 px gap, inline-start. §1.3's rule on which links render |

### 2.3 The banner slot — one, and only one

The card carries **exactly one banner position**, between the subtitle and the first label.
`Banner` component, card scope, pale tinted card (R1/R16), four tones (00-shell §11.4).

**Two conditions true → one banner, and precedence decides which.** Never a merged count here:
an auth card has at most two conditions and merging them into *"2 conditions need your
attention."* on a sign-in screen is worse copy than picking the one the operator can act on.

| Precedence | Condition | Why it wins |
|---:|---|---|
| 1 | `offline` | Nothing else can be acted on |
| 2 | transport `error` | The request did not reach the server, so no domain result exists |
| 3 | `challenge-locked` / `resend-exhausted` | A timed wall; the operator cannot retry now |
| 4 | domain rejection (`credentials-rejected`, code outcomes, `password-rejected`) | Actionable now |
| 5 | informational (`reset-requested`, `reset-succeeded`, session-ended reasons) | Nothing is wrong |

This is **§5.2's merge clause applied, not suspended** — R10's invariant is *one banner*, and
one banner is what renders. Recorded in §14 so a reviewer does not read the missing count as an
omission.

**Every banner takes `role="alert"`** when it announces a rejection or a failure, and
`role="status"` when it is informational (**AC-678**).

### 2.4 Red — checked against R5a before it was spent

**R5a's four:** a destructive button · **one page-level critical banner** · a breached-row
leading-edge marker · a map marker.

**The auth card's failure banner is use #2, not a fifth use.** On an auth screen the card *is*
the page: there is no content region, no rail, no second banner position, and by §2.3 exactly
one banner can render. *One page-level critical banner* is satisfied literally, not by analogy.

**Where red is spent on these surfaces, exhaustively:**

| Surface | Tone | R5a |
|---|---|---|
| `credentials-rejected` banner | `critical` | use #2 |
| `challenge-locked` banner | `critical` | use #2 |
| `code-wrong` banner (attempts 1, 2, 4) | `critical` | use #2 |
| transport `error` banner | `critical` | use #2 |
| `write-permission-revoked-while-dirty` page banner | `critical` | use #2 |
| Inline field error — **border and message only** | `--ev-red` | **Pre-existing, and narrower than four documents claim.** Eight primitives carry `aria-invalid:border-destructive`; the `--ev-red-lt` fill §4.4 requires has **never shipped** — it appears in `src/` only inside the comments at `input.tsx:22` and `field.tsx:12` that quote the unmet rule. Filed as **§6.2 D-14**, recommended as **two signals, not three** — **§16.1** |

**Where red is deliberately *not* spent, and each is a decision:**

| Would-be red | Actual | Reason |
|---|---|---|
| `code-superseded` | **`info`** | Nothing is wrong and no attempt was consumed. Red would say it cost something |
| `code-expired` | **`warning`** | A timer ran out; no attempt consumed |
| `code-invalidated` (3rd wrong) | **`warning`** | The condition is *"this code is gone"*, not *"you got it wrong"* — the wrongness was already announced |
| `resend-exhausted` | **`warning`** | Timed, not failed |
| `offline` | **`warning`** | Matches the shell's own `offline` banner (00-shell §11.6 row 20) |
| Password strength meter, weak | **`warning`** amber | §7.3. A weak password is not a blocked one; it still submits |
| `Discard and sign out` primary in the re-auth modal | **blue** | §5.3 restricts red, it does not mandate it. The shell already ruled this for `navigate-away-dirty` (00-shell §11.6 row 10) |

**The system the operator learns, stated so it is designed rather than emergent:** on the code
screen, **red means the attempt counted.** Amber and blue mean it did not. Colour is never the
sole carrier — every one of those states also says so in words (§7.5, WCAG 1.4.1) — but the
redundancy is what makes it learnable in one shift.

### 2.5 The four base states, on every one of the six cards

| State | Treatment |
|---|---|
| **content** | The card, fields empty or filled |
| **empty** | **Not applicable.** An auth card holds no records. Recorded so nobody builds one (spec §9.1) |
| **loading** | Primary shows an inline progress indicator, keeps its label, is **not re-triggerable** by click, `Enter`, or double-submit (**AC-509**). Every text field becomes **`readOnly`, never `disabled`** — a disabled input greys its value and drops it from some AT trees, and the spec requires the values stay *readable*. Nothing unmounts |
| **error** | §2.3 banner, `critical`, with a `Try again` secondary **inside the banner**. Identifier preserved, password cleared (**AC-511**, **AC-579**) |

**No screen renders a spinner without a resolution** (**AC-580**). Every in-flight state has a
client-side timeout that lands on the transport `error` state.

**`/reset-password` and `/activate` additionally have a mount-time loading state** — the token
is validated before the form is usable — and it renders as a **skeleton shaped like the form**
(two label/field pairs + a button bar), never a centred spinner (**AC-654**).

---

## 3. Screen 1 — `signin` · `/signin`

### 3.1 Content

Wireframe: §2.2 verbatim. Final copy:

| Slot | String | Key |
|---|---|---|
| h1 | `Sign in` | `auth.signin.title` |
| Subtitle | `Eyvar operations console` | `auth.signin.subtitle` |
| Label 1 | `Email` | `auth.field.email` |
| Label 2 | `Password` | `auth.field.password` |
| Link | `Forgot password?` | `auth.signin.forgot` |
| Checkbox | `Remember this device` | `auth.signin.remember` |
| Checkbox helper | `Skips the code on this browser for 30 days. It never skips your password.` | `auth.signin.rememberHelper` |
| Primary | `Sign in` | `auth.signin.submit` |

`Remember this device` is **off by default** (§7.4). Its helper is not decoration: the operator
is agreeing to weaken one factor for a month and the sentence is the only place that is said.
Helper text under the control, never a tooltip (`copy.md` rule 7).

**The card is identical however the operator arrived.** An unauthenticated deep link to
`/financials/payouts` redirects here and the card says nothing about it (**AC-501** still
returns them there afterwards). Reason, and it is not aesthetic: the redirect target is an
attacker-controllable URL parameter, and rendering its title on an unauthenticated page is a
text-injection surface bought for no operator benefit.

### 3.2 Every state

```
── credentials-rejected ────────────────────────────────────────
   ▣ Eyvar
   Sign in
   Eyvar operations console
   ┌────────────────────────────────────────────────┐  --ev-red-lt
   │ ⓘ  That email address and password don't match │  13/600 --ev-red
   │    Check both and try again.                   │  13/400
   └────────────────────────────────────────────────┘
   Email       [ fahad@eyvar.com          ]   ← preserved
   Password    [                       ◉ ]   ← cleared, FOCUSED
   Forgot password?
   ☐ Remember this device
   [               Sign in               ]
```

| State | Trigger | Surface | Copy — final | Notes |
|---|---|---|---|---|
| `credentials-rejected` | Unknown identifier · wrong password · `Suspended` | Banner, **critical** | title `That email address and password don't match` · body `Check both and try again.` | **Byte-identical for all three** (**AC-506**, **AC-578**). Password cleared, identifier kept (**AC-507**), focus to the password field. `role="alert"` announces without stealing focus |
| `account-invited` | `noura.f@eyvar.com` | Same banner, same bytes | *as above* | **AC-508.** The words *invited*, *activate*, *pending* appear nowhere on the surface |
| Format invalid | Identifier is not a plausible email | **Inline field error, two signals:** 1 px `--ev-red` border on the field, and a 12 px `--ev-red` message with a filled circle-exclamation glyph inserted below it, replacing nothing. The label keeps its normal colour. **No `--ev-red-lt` fill** — §16.1, and it is what the codebase already does | `Enter a valid email address.` | **AC-504** — no network request is issued. Period per **R6**, now also in `copy.md` (**F-3**, closed) |
| `challenge-locked` | 5th wrong code, or `locked@eyvar.com` | Banner, **critical** | title `Too many attempts` · body `Wait {duration}, then sign in again.` | Key `auth.lockout.retryIn` `{minutes}`, **plural rule required** (§12.2). **The primary stays enabled** — disabling it would freeze the number on screen forever, and **AC-528** requires the duration to fall on subsequent attempts. **The number never ticks in the browser**: it is re-read from the server per attempt. Contrast §4.4, where the resend cooldown *is* client-ticked, because that one is an admitted courtesy (spec §11.2) |
| `offline` | No connectivity | Banner, **warning** | title `You're offline` · body `Sign-in needs a connection. Nothing you typed has been lost.` | Primary **disabled**, `aria-describedby` → the banner id. Nothing is cleared (**AC-512**). This is the one card state where disabling is right, because there is genuinely no path |
| `error` | Transport failure on `auth.signIn` | Banner, **critical** + secondary `Try again` | title `Couldn't reach the console` · body `Nothing was sent. Try again.` | **AC-511.** Identifier kept, password cleared |
| `session-expired-clean` — idle | Redirect from a clean route | Banner, **info** | title `Your session ended` · body `You were inactive for {duration}. Sign in to continue.` | Key `auth.session.endedIdle` `{minutes}` |
| `session-expired-clean` — absolute | Redirect from a clean route | Banner, **info** | title `Your session reached its 12-hour limit` · body `Sign in to continue.` | **AC-560** — visibly distinct from the idle reason |
| `reset-requested` | Returned from `/forgot-password` | Banner, **info** | §7.2 | |
| `reset-succeeded` | Returned from `/reset-password` | Banner, **success** | §7.5 | |
| `loading` | `auth.signIn` in flight | §2.5 | — | |
| Authenticated operator opens `/signin` | — | **Nothing renders.** Redirect to `session.landingRoute` before the card mounts | — | **AC-502** |

---

## 4. Screen 2 — `signin-verify` · `/signin/verify`

This is the screen an operator meets when they are already annoyed. Everything below is decided
against that.

### 4.1 The seven decisions about the field

**D-OTP-1 — one input, not six boxes.**

Evidence first: the inherited captures.
both show a **single field** holding `000000` / `369867`. `DESIGN.md` §4.2 records the same frame
independently. There is no per-digit input anywhere in 159 frames. Under D14, per-digit-versus-single
is *structure*, and the structure says one field. The product reasons are stronger than the
reference one:

1. **Paste works without a handler.** Six boxes need a paste interceptor on every box, and
   **AC-520/521** are exactly the cases that interceptor gets wrong.
2. **`autocomplete="one-time-code"` works.** OS-level SMS autofill fills one field. It does not
   reliably fill six, and when it half-fills them the operator cannot tell.
3. **Screen readers announce one labelled field with one value.** Six boxes announce as six
   unlabelled edit fields; the operator hears *"edit text, blank"* six times and cannot review
   what they typed.
4. **Backspace, arrow keys and selection are native.** In six boxes every one of those is
   hand-built and every one of them is subtly wrong somewhere.
5. **RTL stops being a problem** (D-OTP-7). Six boxes are the defect spec §12.4 predicts.
6. **The value can be read back.** `369867` in one field is one glance; six boxes are six.
7. **It is smaller**, and this card has one job.

> **Correction to my own prior pass.** `07-rulings-r4.md` §2.1 justified the 400 px card
> partly with *"six 40 px boxes with 8 px gaps = 280"*. **That arithmetic is retired.** The
> width does not move: 400 is on the grid, sits between D-9's 384 prose block and 640 form
> column, and the surviving reason — *a one-to-two-field card at 640 is a form pretending to be
> a page* — carries it alone.

**D-OTP-2 — label above, not the inset label.** §4.2 records an inset/floating label
*"(auth surface only)"* from this exact frame. **Not adopted.** It exists in the inherited auth and
nowhere else in their admin; it forces a second field anatomy in a product that has exactly one;
and §4.2's *label above the field* is a rule about the form primitive, which D14 does not send
to the inherited flow — D14 sends the structure, not the skin. Recorded so nobody "restores" it.

**D-OTP-3 — no placeholder.** The reference shows `000000`. **Overruled.** At 17 px tabular in a
336 px field a six-zero placeholder is indistinguishable from a filled value at a glance, and
"is that my code or theirs?" is the exact confusion this screen cannot afford. §4.2 permits
placeholders only as format examples; the helper text carries the format instead.

**D-OTP-4 — paste moves focus, typing does not.**

| Gesture | Result |
|---|---|
| Paste yielding exactly 6 digits | Field fills, **focus moves to the primary**, **nothing submits** |
| Paste yielding 1–5 digits | Field fills, focus stays in the field |
| Paste yielding >6 digits | First 6 kept, rest dropped, focus moves to the primary |
| Typing the 6th digit | **Focus does not move.** The caret stays |

Why the asymmetry: a paste is one atomic act whose whole result the operator can see, so
handing them the button is a favour. A typist's next keystroke after the 6th digit would land on
the button, where `Space` or `Enter` submits a code they have not read. **No auto-submit at all**
(spec §5.2): the cost of not auto-submitting is one keystroke; the cost of auto-submitting is a
consumed attempt on a screen where the fifth costs fifteen minutes.

**D-OTP-5 — sanitising.** Non-digits are rejected **at input time**, so the keystroke never
lands (**AC-518**). Pasted content is stripped of spaces, hyphens, en-dashes, non-breaking
spaces and every non-digit **before** it is measured, because `123 456` and `123-456` are what
an SMS client copies (**AC-521**).

**D-OTP-6 — attributes.** `inputMode="numeric"` · `pattern="[0-9]*"` ·
`autoComplete="one-time-code"` · `maxLength={6}` · `spellCheck={false}` ·
`autoCapitalize="off"` · `dir="ltr"` **always, in both languages** · autofocus on mount.

**D-OTP-7 — the digits are centred, and that is the RTL answer.**

`text-align: center`, `--text-lg` (17/24), `font-variant-numeric: tabular-nums`, `dir="ltr"`.

Spec §12.4 flags this as *"the single most likely RTL defect on this surface"* and asks me to
take the position explicitly. **I take it: the field is centred, and centring is the position.**
A 6-digit run in a 336 px field aligned to either edge looks deliberate in one language and
broken in the other; centre has no direction at all, so English and Arabic render identically
and **AC-537 / AC-674 pass by construction rather than by care**. `dir="ltr"` on the element
pins the digit order, which is `rtl.md`'s numeral-run rule applied. This is a **one-field
exception** to §4.2's inline-start value alignment and it is recorded in §14.

### 4.2 The card

```
   ┌─ 400 ───────────────────────────────────────────────┐
   │   ▣ Eyvar                                           │
   │   Check your messages                               │  h1 22/28
   │   Sent to ••••••67                                  │  13/20 --ev-text-2, <bdi dir=ltr>
   │                                                     │
   │   [ BANNER SLOT ]                                   │
   │                                                     │
   │   Verification code                                 │
   │   ┌───────────────────────────────────────────────┐ │  40px
   │   │                 4 2 8 9 1 6                   │ │  17/24 tabular, CENTRED, dir=ltr
   │   └───────────────────────────────────────────────┘ │
   │   6 digits. Codes expire 10 minutes after they're   │  12px --ev-text-2 helper
   │   sent.                                             │
   │                                                     │
   │   ┌───────────────────────────────────────────────┐ │
   │   │                   Verify                      │ │  full-width primary
   │   └───────────────────────────────────────────────┘ │
   │   ┌───────────────────────────────────────────────┐ │
   │   │             Resend code in 27s                │ │  full-width SECONDARY, disabled
   │   └───────────────────────────────────────────────┘ │
   │   Use a different account                           │  12px plain button, inline-start
   │                                                     │
   │   Privacy   Terms                                   │
   └─────────────────────────────────────────────────────┘
```

**`Resend code` is a full-width secondary button**, not a link. Evidence:
The inherited capture puts its alternate action (`Use a recovery code`) in
exactly that slot and shape. Eyvar has no recovery codes, so the slot is filled with the action
Eyvar does have. A full-width button also gives the countdown somewhere to live without the
label reflowing.

| Slot | SMS | TOTP | Key |
|---|---|---|---|
| h1 | `Check your messages` | `Check your authenticator app` | `auth.otp.title.sms` / `.totp` |
| Subtitle | `Sent to {hint}` → `Sent to ••••••67` | `Enter the current code from the app` | `auth.otp.sentTo` `{hint}` / `auth.otp.fromApp` |
| Label | `Verification code` | same | `auth.otp.label` |
| Helper | `6 digits. Codes expire 10 minutes after they're sent.` | `6 digits, from the app on your phone.` | `auth.otp.helper.sms` / `.totp` |
| Primary | `Verify` | same | `auth.otp.submit` |
| Secondary | `Resend code` / `Resend code in {seconds}` | `Resend code` is **not rendered** — a TOTP app generates its own | `auth.otp.resend` / `auth.otp.resendIn` |
| Escape | `Use a different account` | same | `auth.otp.otherAccount` |

**The mask is two digits, not four.** §12.2's example string `Sent to ••• ••• 4567` shows four
and **AC-519** forbids more than two. AC-519 binds; §12.2's example is overruled (§15). The
glyph is `•` U+2022, six of them, then the two digits, all inside one `<bdi dir="ltr">`
(**AC-675**).

`Use a different account` returns to `/signin` with the identifier **cleared** and the challenge
abandoned server-side.

### 4.3 Attempts 1 to 5, drawn

Counted **per challenge**, wrong attempts only. Superseded and expired never tick (§5.3).

| # | Tone | Title | Body | Field | Resend control |
|---:|---|---|---|---|---|
| 1 | **critical** | `That code is incorrect` | `Check the newest message and try again.` | cleared, focused | unchanged, cooldown keeps running |
| 2 | **critical** | `That code is incorrect` | `Check the newest message and try again. One more wrong attempt cancels this code.` | cleared, focused | unchanged |
| 3 | **warning** | `This code was cancelled` | `Three wrong attempts, so the code no longer works. Send a new one.` | cleared **and `readOnly`** until a new code lands | **enabled immediately, ignoring the cooldown**; label becomes `Send a new code` |
| 4 | **critical** | `That code is incorrect` | `One more wrong attempt and you'll need to sign in again.` | cleared, focused | unchanged |
| 5 | — | — | — | — | — |

**On the 5th**, the operator is returned to `/signin` and that card shows `challenge-locked`
(§3.2). A security notification goes to the account's own address and `challenge_locked` is
emitted (§12.3 of the spec). **Nothing here is a permanent lock** (**AC-527**, **AC-528**).

Attempts 4 and 5 run against a *new* code, because 3 cancelled the old one — the counter is per
**challenge**, spanning codes. **AC-526** and **AC-529** (`999999` reaches the locked state
directly) both hold.

**Why attempt 2 names the consequence and attempt 1 does not.** Telling an operator *"4 attempts
left"* after one mistype is alarm without information. Telling them *"one more cancels this
code"* at the moment it becomes true is the only warning that changes what they do next. This
is not an enumeration oracle: the operator passed the password step, so their identity is
already established (§5.3).

### 4.4 The three non-counting outcomes, and the resend cooldown

| State | Tone | Title | Body | Counter | Resend |
|---|---|---|---|---|---|
| `code-superseded` | **info** | `That code has been replaced` | `A newer code was sent. Enter the one from the most recent message.` | does **not** tick | unchanged |
| `code-expired` | **warning** | `That code has expired` | `Codes last 10 minutes. Send a new one.` | does **not** tick | **enabled regardless of cooldown**, label `Send a new code` |
| `resend-exhausted` | **warning** | `That verification expired` | `Five codes were sent for this sign-in. Sign in again to start over.` | — | replaced by a full-width primary `Go to sign in` |

**The supersession trap is closed before it springs, not after.** The moment `Resend` succeeds,
the banner reads:

> **info** · title `A new code is on its way` · body `Enter the newest code. Earlier codes no longer work.`

Spec §5.3 identifies the real failure — *an operator pressed Resend, then typed the first SMS
because it arrived first and is higher up the list.* Telling them after they have already done
it is a recovery; telling them the instant they press Resend is a prevention, and it costs one
sentence.

**The cooldown copy while it counts.**

| Property | Value |
|---|---|
| Label, disabled | `Resend code in {seconds}s` → `Resend code in 27s`. Key `auth.otp.resendIn` `{seconds}` |
| Label, enabled | `Resend code` |
| Label, after a cancelled code (3rd wrong) or an expired one | `Send a new code` |
| Schedule | 30 s → 60 s → 120 s per challenge (spec §5.1). **AC-532**: the first is > 0 and the second is longer |
| Tick | Once per second, in the browser. This is an admitted **courtesy** (spec §11.2) — the server enforces the cooldown regardless — which is exactly why it *may* tick, unlike the lockout minutes in §3.2, which may not |
| **Announcement** | The ticking number is inside `aria-live="off"`. A per-second live region is unusable with a screen reader. **One** polite announcement fires when the control re-enables: `Resend code is available.` Key `auth.otp.resendReady` |
| Resends left | When 2 or fewer remain, a 12 px `--ev-text-2` line under the button: `2 resends left before you'll need to sign in again.` Key `auth.otp.resendsLeft` `{count}`, plural rule required |
| `prefers-reduced-motion` | The countdown is a text change, not an animation. It is unaffected, and it is **not** an ambient loop under R18 |

### 4.5 The remaining states

| State | Surface | Copy — final |
|---|---|---|
| `code-sent` (mount) | No banner. The subtitle carries the destination and the resend button carries the first cooldown | — |
| `loading` | Primary shows progress; the field goes `readOnly`; the resend button disables | — |
| `error` (transport, **AC-535**) | Banner, **critical** + `Try again` | title `Couldn't check that code` · body `Nothing was counted against your attempts. Try again.` — **the entered digits are preserved** |
| resend transport error (**AC-536**) | Banner, **critical** + `Try again` | title `Couldn't send a new code` · body `Your current code still works. Try again.` |
| `offline` | Banner, **warning**; primary and resend disabled with `aria-describedby` | title `You're offline` · body `Codes can't be checked without a connection. Nothing you typed has been lost.` |
| **`challenge-missing`** *(added — §15)* | The whole card is replaced: h1 `That verification is no longer open` · body `Sign in again to get a new code.` · full-width primary `Go to sign in` | Reached by browser-back-then-forward (**AC-582**), by a code issued in another browser context (**AC-531**), and by opening `/signin/verify` directly |
| **`challenge-completed-elsewhere`** *(added — §15)* | Banner, **info**; field and primary `readOnly`; primary replaced by `Go to sign in` | title `This sign-in finished in another tab` · body `The console is already open there. Sign in again here if you need a second session.` — **AC-583**, and it says so rather than hanging |
| Replay of a consumed code (**AC-530**) | `challenge-missing`. No second session is issued | — |

---

## 5. Screen 3 — `signin-enroll` · `/signin/enroll`

Not skippable, not dismissible, and **it is not onboarding** (spec §4.4). Two steps, one card,
one route.

### 5.1 Step A — choose the method

```
   ┌─ 400 ───────────────────────────────────────────────┐
   │   ▣ Eyvar                                           │
   │   Set up your verification code                     │
   │   Every sign-in needs a code. This can't be         │
   │   turned off.                                       │
   │                                                     │
   │   [ BANNER SLOT ]                                   │
   │                                                     │
   │   ⦿  Text message                                   │  radio-group, 13/600
   │      A 6-digit code by SMS, each time you sign in.  │  12px --ev-text-2
   │                                                     │
   │      Mobile number                                  │  revealed when chosen
   │      ┌─────────────────────────────────────────┐    │
   │      │ +966 5X XXX XXXX                        │    │  placeholder = format example
   │      └─────────────────────────────────────────┘    │
   │      Use +966 55 123 4567 from your profile         │  12px plain button
   │                                                     │
   │   ○  Authenticator app                              │
   │      A code from an app on your phone. Works        │
   │      without signal.                                │
   │                                                     │
   │   ┌───────────────────────────────────────────────┐ │
   │   │                 Send code                     │ │
   │   └───────────────────────────────────────────────┘ │
   │   Sign out                                          │  12px plain button
   └─────────────────────────────────────────────────────┘
```

| Decision | Ruling |
|---|---|
| The phone field is **empty on mount** | `TeamUser.phone` is seeded for four of five legacy users (`:2831`–`:2841`) and is not a reliable pre-fill. Spec §4.4: *shown as a suggestion, never as a default the operator can accept without reading.* The suggestion is a **button that fills the field**, so accepting it is an act |
| The suggestion shows the number **unmasked** | The whole point is that they read it. It is their own account and they have already passed the password step. Masked everywhere *after* enrolment |
| The only escape is `Sign out` | **AC-515** — no route out, no skip, no dismiss. But **AC-581** forbids a dead end, so the exit must be *visible*. A 12 px plain button at the card's foot is the smallest honest one |
| Radio, not toggle or select | §4.3 — two mutually exclusive options, both needing a description. `radio-group` |
| TOTP branch | Choosing it reveals a QR canvas (144 px) plus the secret as selectable text, `font-mono`, `dir="ltr"`, inside `<bdi>`. **The QR does not mirror** (`rtl.md`, media glyphs). Primary becomes `Continue` |

Copy:

| Slot | String | Key |
|---|---|---|
| h1 | `Set up your verification code` | `auth.enroll.title` |
| Subtitle | `Every sign-in needs a code. This can't be turned off.` | `auth.enroll.subtitle` |
| Option 1 | `Text message` / `A 6-digit code by SMS, each time you sign in.` | `auth.enroll.sms` / `.smsHelp` |
| Option 2 | `Authenticator app` / `A code from an app on your phone. Works without signal.` | `auth.enroll.totp` / `.totpHelp` |
| Field | `Mobile number`, placeholder `+966 5X XXX XXXX` | `auth.enroll.phone` |
| Suggestion | `Use {phone} from your profile` | `auth.enroll.usePhone` `{phone}` |
| TOTP secret label | `Can't scan it? Enter this key in the app` | `auth.enroll.secret` |
| Primary | `Send code` (SMS) / `Continue` (TOTP) | `auth.enroll.send` / `.continue` |
| Escape | `Sign out` | `auth.signOut` |

### 5.2 Step B — confirm

The §4 card, three strings changed: h1 `Confirm your number` (SMS) / `Confirm your app`
(TOTP) · subtitle `Sent to +966 55 123 4567` — **unmasked here**, because the operator is
confirming the number they just typed and masking it would defeat the confirmation · escape
becomes a plain button `Use a different method`, returning to step A with the choice preserved.

The number is verified by completing one §4 challenge against it **before the session is
issued** (spec §4.4). Every §4.3 attempt rule applies unchanged.

### 5.3 States

| State | Copy |
|---|---|
| `enrolment-required` | This screen. Reached whenever `secondFactor === null` |
| Invalid phone format | Inline field error: `Enter a mobile number with its country code.` |
| `loading` | §2.5 |
| `error` (**AC-516**) | Banner, **critical** + `Try again` · title `Couldn't set up your verification code` · body `Nothing was saved. Try again.` The operator is still not signed in |
| `offline` | §3.2's copy |

**AC-517 / AC-664:** no control anywhere in this product disables the second factor for any
account, for any role, including Owner. The legacy per-user `twoFA` toggle (`:3023`, `:3047`)
and the workspace `require2FA` setting (`:8028`) are **not drawn on any screen in this
document.** Their absence is the design.

---

## 6. Screen 4 — `forgot-password` · `/forgot-password`

```
   ┌─ 400 ───────────────────────────────────────────────┐
   │   ▣ Eyvar                                           │
   │   Forgot your password?                             │
   │   Enter the email address you sign in with.         │
   │                                                     │
   │   [ BANNER SLOT ]                                   │
   │                                                     │
   │   Email                                             │
   │   ┌───────────────────────────────────────────────┐ │
   │   │ fahad@eyvar.com                               │ │  pre-filled from /signin (AC-513)
   │   └───────────────────────────────────────────────┘ │
   │                                                     │
   │   ┌───────────────────────────────────────────────┐ │
   │   │              Send reset link                  │ │
   │   └───────────────────────────────────────────────┘ │
   │   Return to sign in                                 │  13px plain button
   │                                                     │
   │   Privacy   Terms                                   │
   └─────────────────────────────────────────────────────┘
```

One field, one primary, one escape (**AC-538**). Structure from

| Slot | String | Key |
|---|---|---|
| h1 | `Forgot your password?` | `auth.forgot.title` |
| Subtitle | `Enter the email address you sign in with.` | `auth.forgot.subtitle` |
| Primary | `Send reset link` | `auth.forgot.submit` |
| Escape | `Return to sign in` | `auth.forgot.return` |

`Return to sign in` is verb-first (`copy.md` rule 2); `Back to sign in` is not, which is why it
is not used.

| State | Copy |
|---|---|
| Format invalid | Inline field error: `Enter a valid email address.` No network request |
| `loading` | §2.5 |
| `reset-requested` | §7.2 — and the operator lands on `/signin`, not here |
| `error` (**AC-549**) | Banner, **critical** + `Try again` · title `Couldn't send a reset link` · body `Nothing was sent. Try again.` — **visibly different from the confirmation**, which is the whole point of AC-549 |
| `offline` | §3.2's copy |

---

## 7. The reset flow's three surfaces

### 7.1 Where the confirmation lands

**On `/signin`, not on `/forgot-password`.** The inherited capture shows the
banner on a card headed `Log in`, with the identifier still filled — the reference returns you
to sign-in. Under D14 that placement is structure and it is kept. It is also the better
outcome: the operator's next act is in their mailbox, not on this screen, and §6.3 deliberately
keeps signing in normally from invalidating the link, so returning them to the form that lets
them do it is the point.

**AC-540** — *"an in-card banner between the heading and the field"* — is satisfied: the sign-in
card's banner slot (§2.3) sits between the subtitle and the identifier field. Recorded as a
clarification in §15, not an overrule.

### 7.2 The non-committal confirmation — the sentence, final

> **`info` tone.** Glyph ⓘ, fill `--ev-blue-lt`, label `--ev-blue-dk`.
>
> **Title** `Check your inbox`
> **Body** `If that address has an Eyvar account, a reset link is on its way. It expires in 60 minutes.`

**Not `success`, and this is the decision.** The reference uses a green ✓. Under D14 the **placement** is the inherited one and the **tone**
is ours, and success asserts that something happened — which is the exact claim this banner
exists to refuse. A green tick over a conditional sentence is a contradiction the operator reads
faster than the words.

Checks: **AC-539** — byte-identical for a known and an unknown address. **AC-541** — the copy
contains none of *found*, *exists*, *no account*, and no holder's name. **AC-540** — the expiry
is stated in words, in an in-card banner, not a toast. The title addresses the operator (who has
an inbox) rather than the address (which may not have an account), so the conditional lives
entirely in the body where it belongs.

Two things this sentence *requires* and cannot deliver alone, both server guarantees (spec §11):
identical wording **and identical timing** for known and unknown, and per-identifier and
per-source rate limiting. **The copy is a promise the client cannot keep by itself**, and it is
worth the frontend engineer knowing that before they ship it.

### 7.3 Screen 5 — `reset-password` · `/reset-password?token=…`

```
   ┌─ 400 ───────────────────────────────────────────────┐
   │   ▣ Eyvar                                           │
   │   Choose a new password                             │
   │   For fahad@eyvar.com                               │  <bdi dir=ltr>
   │                                                     │
   │   [ BANNER SLOT ]                                   │
   │                                                     │
   │   New password                                      │
   │   ┌─────────────────────────────────────────┬─────┐ │
   │   │ ••••••••••••••••                        │  ◉  │ │
   │   └─────────────────────────────────────────┴─────┘ │
   │   ▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬ │  4px meter, --ev-green
   │   Password strength: strong                         │  12/600 --ev-green
   │   At least 12 characters. Longer is better than     │  12px --ev-text-2 helper,
   │   more complicated.                                 │  PRESENT BEFORE TYPING (AC-545)
   │                                                     │
   │   Confirm new password                              │
   │   ┌─────────────────────────────────────────┬─────┐ │
   │   │ ••••••••••••••••                        │  ◉  │ │
   │   └─────────────────────────────────────────┴─────┘ │
   │                                                     │
   │   ┌───────────────────────────────────────────────┐ │
   │   │               Reset password                  │ │
   │   └───────────────────────────────────────────────┘ │
   └─────────────────────────────────────────────────────┘
```

Structure from the inherited capture: two fields, a reveal on each, the meter as
a full-width bar **directly under the first field**, a bold caption under the bar.

**The strength meter — three levels, two tones, no red, no blue.**

| Level | Bar | Caption | Caption colour |
|---|---|---|---|
| Under 12 characters | Track only, no fill | `At least 12 characters` | `--ev-text-2` |
| 12+, weak | 50 %, `--ev-amber` | `Password strength: weak` | `--ev-amber-dk` |
| 12+, strong | 100 %, `--ev-green` | `Password strength: strong` | `--ev-green` |

Track `--ev-bg2`, 4 px tall, `--ev-radius-control`. **No red at any level** — R5a, and a weak
password is not a blocked one. `--ev-blue` is not used either: its declared roles are focus ring,
chart series, selection and a link on white (`03-visual-language.md` §1.3), and a strength bar
is none of them.

**The meter never gates submission.** It is a courtesy (spec §11.2). Only the 12-character minimum,
the match check, and the server's breach list gate the primary. Stated because an engineer will
otherwise disable `Save` on `weak`.

`aria-hidden` on the bar; `role="status"` `aria-live="polite"` on the caption. The caption
carries the meaning; colour never does alone.

**The policy is stated before the operator types** (**AC-545**): helper text under the first
field, present at mount, `At least 12 characters. Longer is better than more complicated.` The
second clause is doing real work — it is what stops an operator producing `Password1!` and
believing they complied.

| State | Surface | Copy |
|---|---|---|
| mount `loading` | Skeleton shaped like the form inside the card | — |
| Under 12 (**AC-546**) | Inline field error under field 1; primary disabled | `Use at least 12 characters.` |
| Mismatch (**AC-547**) | Inline field error under **field 2**; primary disabled | `Enter the same password in both fields.` |
| `password-rejected` (**AC-548**) | Inline field error under field 1, **after submission**; both fields keep their contents | `This password has appeared in a known breach. Choose a different one.` |
| `reset-token-invalid` (**AC-543**, **AC-544**) | **The whole card is replaced.** No form, no banner — a banner above an absent form is nonsense | h1 `This link is no longer valid` · body `Reset links work once and expire after 60 minutes. Request a new one.` · full-width primary `Request a new link` → `/forgot-password` |
| token-validation transport error (**AC-550**) | The form renders **disabled**, h1 unchanged, banner **critical** + `Try again` | title `Couldn't check that link` · body `Nothing has changed. Try again.` — explicitly **not** the invalid-link state |
| `error` on submit (**AC-551**) | Banner, **critical** + `Try again`; both fields keep their values | title `Couldn't reset your password` · body `Nothing was changed. Try again.` |

**One state for all four invalid-token causes** — unknown, used, superseded, expired.
Distinguishing them tells a link-holder which kind of link they are holding.

**The token never appears on screen** and there is no copy-link affordance (**AC-591**). It stays
in the URL because it must survive a refresh; after a successful reset the app does a
`history.replace` to `/signin` so a spent token does not sit in the address bar.

### 7.4 Screen 6 — `set-password` · `/activate?token=…`

The §7.3 form, four strings changed. This is the `Invited → Active` transition that has never
existed (**D-A7**).

| Slot | String | Key |
|---|---|---|
| h1 | `Set your password` | `auth.activate.title` |
| Subtitle | `You've been invited to Eyvar as {role}.` | `auth.activate.subtitle` `{role}` — role is itself a key (`role.opsManager`), never an English literal interpolated into Arabic |
| Label 1 | `Password` | `auth.field.password` |
| Primary | `Set password` | `auth.activate.submit` |

On success: `status: 'Active'`, `lastLoginAt` set, and the operator continues to **`signin-enroll`**
(§5), then §4, then the session, then the onboarding layer auto-opens (**AC-555**, **AC-593**).
A reset does not sign anyone in and neither does an activation.

| State | Copy |
|---|---|
| Invalid / expired invite token | Whole card replaced: h1 `This invite is no longer valid` · body `Invites expire after 7 days. Ask the person who invited you to send a new one.` · plain button `Go to sign in`. **AC-581** — the stated next action is the exit; the button stops it being a cul-de-sac |
| `error` (**AC-556**) | Banner, **critical** + `Try again` · title `Couldn't set your password` · body `Your account is unchanged. Try again.` — status is still `Invited` |

### 7.5 After a successful reset

The operator lands on `/signin` with a **success** banner. This is R10's paired case: the action
completed **and** left a next step.

| `{count}` | Body |
|---|---|
| ≥ 1 | `{count} other sessions ended, and every remembered device will ask for a code again. Sign in with your new password.` |
| 0 | `Every remembered device will ask for a code again. Sign in with your new password.` |

Title `Your password was reset`. Key `auth.reset.done` `{count}` with an ICU plural carrying an
explicit `=0` form — **not** two keys, and never a concatenation (**AC-670**).

**AC-552 — the ✓ holds for `{count} ≥ 1` only, and the `=0` branch is the design, not a gap.**
AC-552 as originally written required the confirmation to name the count of ended sessions. The
`=0` form above deliberately names **no** count, because `0 other sessions ended` is not a
sentence anyone should ship. **The design is right and an unqualified ✓ against it would be
wrong** — so it is qualified here. AC-552 has been corrected on the spec side to scope its
requirement to the non-zero case; this line is the record of why.

**AC-554 — the design's share is the telling, not the revoking.** The revocation itself is a server guarantee (§11); no design spec can satisfy that criterion and an unqualified ✓ here would claim it does. What this surface owes is that the operator is **told**, and it has to be: the operator is about
to be asked for a code on a browser that stopped asking a month ago, and an unexplained code
request after a password reset is exactly the event that makes someone think they have been
attacked.

---

## 8. The session — and the case that costs real work

Spec §7.3 calls this *"the most important rule in §7 and the one an implementation will get
wrong."* It has no reference in either screenshot set. Everything in §8 is `[originated]`.

### 8.1 The freeze contract

A session that expires while a Finance lead is halfway through a payout adjustment must not
throw that away. The rule, restated as something an engineer can implement:

```
   session expires
        │
        ├─ active route CLEAN ────────► redirect /signin  +  info banner naming the reason
        │                                                    (§3.2 — nothing is lost)
        └─ active route DIRTY ────────► FREEZE
                                          1. nothing unmounts
                                          2. no route change, no reload, no scroll change
                                          3. every text input  → readOnly
                                          4. every button that mutates → disabled
                                          5. every open shell layer → closed
                                          6. SaveBar stays up, still reporting `dirty`
                                          7. reauth modal opens
```

| Rule | Spec | Why it is stated this precisely |
|---|---|---|
| Text inputs go **`readOnly`, never `disabled`** | Values stay on screen, selectable, copyable, and in the AT tree | **AC-562** requires the values still on screen; **AC-586** requires them *selectable*. A `disabled` input greys its value and drops out of some AT trees, which loses the operator the one thing the freeze exists to protect |
| Buttons go **`disabled`** with `aria-disabled` | They cannot fire | §11.2 of foundation: *gate at render, not at commit*. **AC-667** — nothing is enabled-then-refused |
| The reason is **one string, referenced by many controls** | A visually-hidden `<p id="session-expired-reason">` in the shell holds `Your session expired. Sign in again to save your changes.` Every frozen control carries `aria-describedby="session-expired-reason"` | **AC-563** — *"each carries a reason available without a pointer hover."* A `title` attribute is hover-only and fails this outright. One id, one string, no per-control copy |
| **Every open shell layer closes first** | `entity` · `notifications` · `account` · `onboarding` | R4-3 §3.2's consequence: tier 3 may not composite over tier 2, because §5.0 forbids a modal nested in a drawer. **Form state is preserved; overlay state is not**, and those are different things |
| Reads stop | No polling, no refetch, no count refresh | The rail's counts keep their last value rather than going to skeleton — a frozen console that starts flickering reads as broken |
| Focus is **captured** | The element that had focus at freeze time is recorded and restored on success | **AC-565** |
| Scroll is untouched | The page is not re-rendered from the top | **AC-565** |

**The two-mount-point cost, and how much of it is real.** Spec §7.3 flags that the sign-in
surface must exist twice — as a route outside `AppLayout` and as a surface over a mounted app —
and asks the engineer to respond rather than comply. **The response is a reduction, not a
refusal:** there is **one `<AuthCredentialForm>`** with a `mode` prop, mounted twice.

| | `mode="signin"` | `mode="reauth"` |
|---|---|---|
| Identifier | editable field | **fixed text, not a field** (§8.3) |
| `Remember this device` | present | absent — the device has not changed |
| `Forgot password?` | present | absent — a reset would kill this session and the work with it |
| Legal row | present | absent |
| Container | the §2 auth card | the §8.2 modal body |

That is one form, one validation path, one set of copy keys, and two containers. **The
guarantee is not dropped and nobody may drop it.**

### 8.2 The re-authentication modal

**R4-3 ruled it a modal, not a fifth shell layer**, and the reasoning is §7.3.3's focus law:
*the scrim decides the trap.* A no-scrim layer does not trap, so `Tab` would walk the operator
out of the only working control on screen into a field of frozen ones with nothing to tell them
they had left.

```
          ░░░░░░░░░░░░░░░░ scrim ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
          ░  ┌─ 440 ─────────────────────────────────────────────┐  ░
          ░  │  Your session expired                             │  ░  h2 17/600
          ░  │  Your unsaved changes are still here. Sign in to   │  ░  13/20 --ev-text-2
          ░  │  keep working.                                     │  ░
          ░  │                                                    │  ░
          ░  │  [ BANNER SLOT ]                                   │  ░
          ░  │                                                    │  ░
          ░  │  Signed in as fahad@eyvar.com                      │  ░  13px --ev-text-2
          ░  │                                                    │  ░  NOT a field
          ░  │  Password                                          │  ░
          ░  │  ┌──────────────────────────────────────┬───────┐  │  ░
          ░  │  │                                      │   ◉   │  │  ░
          ░  │  └──────────────────────────────────────┴───────┘  │  ░
          ░  │                                                    │  ░
          ░  │                        [ Sign out ]  [  Sign in ]  │  ░  footer
          ░  └────────────────────────────────────────────────────┘  ░
          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░
              ▲ behind: the console, mounted, frozen, SaveBar up
```

| Property | Value |
|---|---|
| Component | `alert-dialog`, **not** `dialog` |
| Width | **440 px** — 00-shell §13.1's confirmation/one-field size. R4-3 |
| Elevation | `--ev-shadow-3` + scrim. The only scrimmed tier (`tokens.md`) |
| `Escape` | **does not close** |
| Outside click | **does not close** |
| Close `✕` | **absent** |
| Focus | **traps.** It has a scrim, so it owns the keyboard (§7.3.3) |
| Focus on open | The password field |
| Focus on close | The element captured at freeze time (**AC-565**) |
| Position | Vertically centred (§5.3) |

**There is no identifier field, and that is how §7.6 is enforced.**

Spec §7.6 requires that signing in as a different operator from this surface is refused, because
a mounted app holding one operator's dirty form must never be handed to another operator's
session — that is `00c` **F5** recreated in a new place. **A refusal is a check that can be
forgotten. An absent field cannot be.** The account is rendered as text, bound to the expired
session's `userId`, and the named path to a different account is `Sign out`.

This **overrules AC-567's mechanism** (§15). The outcome is strictly stronger: prevention
instead of refusal.

| State | Surface | Copy — final |
|---|---|---|
| content | The modal above | title `Your session expired` · body `Your unsaved changes are still here. Sign in to keep working.` · account line `Signed in as {email}` · primary `Sign in` · secondary `Sign out` |
| **absolute expiry** variant | Same modal | title `Your session reached its 12-hour limit` · body unchanged. **AC-560** distinguishes it here too, not only on `/signin` |
| `loading` | Primary shows progress, not re-triggerable; the field goes `readOnly`; `Sign out` disabled | — |
| wrong password | Banner **critical** | title `That password is wrong` · body `Try again, or sign out and start over.` **This one may name the password**, unlike §3.2 — the identity is fixed and displayed, so there is no enumeration to protect |
| second factor needed (**AC-573**) | **The same modal swaps its body in place.** No second modal, no route change, no remount | title `Enter your verification code` · body `Sent to {hint}` · the §4 field, centred, `dir="ltr"` · primary `Verify`. `Resend code` appears as a full-width secondary above the footer. The dirty form is untouched throughout |
| trusted device (**AC-573**) | Password only. The code step never renders | — |
| account can no longer sign in | Banner **critical**; primary disabled | title `This account can no longer sign in` · body `Sign out, then ask an owner in Admin › Team & Access.` |
| `error` (**AC-574**) | Banner **critical** + `Try again`; the app stays mounted and the dirty form is intact | title `Couldn't sign you in` · body `Your changes are still here. Try again.` |
| `offline` | Banner **warning**; primary disabled with `aria-describedby` | title `You're offline` · body `Your changes are still here. They'll save when you're back and signed in.` |
| success | Modal closes, freeze lifts, focus restores, scroll unchanged, SaveBar still `dirty` (**AC-565**). **No toast** — nothing was accomplished that the operator does not already see | — |

**AC-566** — the save that follows writes **one** audit row attributed to the operator who typed
the form. The re-auth path may not reassign the actor. This is the whole reason §8.2 has no
identifier field.

### 8.3 `Sign out` from inside the modal, while dirty

A trap worth designing rather than discovering: `Sign out` while dirty needs a confirmation, and
§5.5 forbids a modal nested inside another surface.

**Ruling: the modal swaps its own body into the confirmation, in place.** One modal, two bodies,
no nesting.

```
   ┌─ 440 ─────────────────────────────────────────────┐
   │  Sign out and lose your changes?                  │
   │  Your unsaved payout adjustment will be           │  entity-specific, from the SaveBar
   │  discarded. Anything you saved earlier is         │  label
   │  unaffected.                                      │
   │                                                    │
   │                    [ Cancel ]  [ Discard and sign out ]
   └────────────────────────────────────────────────────┘
```

| Slot | String | Key |
|---|---|---|
| Title | `Sign out and lose your changes?` | `auth.reauth.signOutConfirm.title` |
| Body | `Your unsaved {entity} will be discarded. Anything you saved earlier is unaffected.` | `auth.reauth.signOutConfirm.body` `{entity}` |
| Cancel | `Cancel` — returns to the password body, field cleared | `common.cancel` |
| Primary | `Discard and sign out` | `auth.reauth.signOutConfirm.confirm` |

The primary is **blue, not red** — §5.3 restricts red, it does not mandate it, and the shell
already took this position for `navigate-away-dirty` (00-shell §11.6 row 10). The body says what
does *not* change (`copy.md` rule 9).

`{entity}` comes from the SaveBar's own dirty label (`Unsaved plan` → `plan`), so the two
surfaces name the same object (`copy.md` rule 5).

### 8.4 Explicit sign-out while dirty, from the account menu

**AC-568.** Not the §8.3 path — the session is alive, so this is the shell's existing
`navigate-away-dirty` modal (00-shell §11.6 row 10), unchanged, with `Discard changes` reworded
to `Discard and sign out`. Cancelling leaves the operator signed in and the form dirty. Only the
operator discards their own work.

### 8.5 `write-permission-revoked-while-dirty`

The permission that authorises the pending save is removed while the form is open. The session
is fine; the save is not.

| Part | Spec |
|---|---|
| Surface | **One page-level `critical` banner** (R5a use #2), first element of the content block, spanning main + rail (00-shell §11.4) |
| Title | `You can no longer save this change` |
| Body | `The "{permission}" permission was removed while you were editing. Your changes are still here — copy anything you need before discarding.` |
| Key | `session.writeRevoked` `{permission}` |
| `Save` | **disabled**, `aria-describedby` → the banner |
| `Discard` | **stays enabled** |
| The form | Content stays on screen and **selectable** — `readOnly`, not `disabled` |
| Never | A silent drop. A toast. A redirect |

The clause *"copy anything you need before discarding"* is the whole point of the state. Without
it the operator has a screen full of work and no stated way to keep any of it.

**AC-586** ✓. `role-revoked-in-session` more broadly is the shell's existing `role-switched`
(00-shell §11.6 row 21) — rail, sub-tab list and counts re-derive without a reload, and a
now-forbidden route renders `route-forbidden`, never a redirect (**AC-584**, **AC-585**,
**AC-588**, **AC-665**). Not redesigned here.

### 8.6 The idle warning, and the merge rule

**A shell banner, `warning` tone, 32 px, full viewport width above the top bar** (00-shell §4.2).
Not a modal — it would block the work the timeout is about to interrupt. Not a toast — a
countdown outlives any toast (R10).

| Slot | String | Key |
|---|---|---|
| Line | `Your session ends in {duration}.` | `session.idleWarning` `{minutes}`, plural rule |
| Action | `Stay signed in` — one secondary button | `session.staySignedIn` |

| Rule | Spec |
|---|---|
| Appears | At **2 minutes** remaining (spec §7.2) |
| Ticks | **Per minute, not per second.** `in 2 minutes.` → `in 1 minute.` → `in less than a minute.` Three renders, three `aria-live="polite"` announcements. A per-second live region is unusable with a screen reader, and a per-second visual tick on a standing banner is an ambient loop R18 does not licence |
| The banner appearing does **not** extend the session | Only `Stay signed in` does (**AC-559**), and activating it removes the banner |
| Undismissable | It names a standing condition (00-shell §11.4's dismiss rule) |
| Not a modal, no scrim | **AC-558** |

**The merge rule, and the one place I depart from it.**

00-shell §4.2 says two or more shell conditions **merge into one banner carrying a count**
(`2 conditions need your attention.`). **The idle warning does not merge. It takes the slot
outright and restores what it displaced when it resolves.**

Why: every other shell condition — impersonating, on a call, offline — is indefinite. This one
has a deadline and a two-minute life, and folding a deadline into a count destroys the only
information it carries. An operator who reads *"2 conditions need your attention"* and expands
it has spent fifteen of their hundred and twenty seconds.

**R10's invariant is untouched** — one banner renders, never two. What is suspended is
§5.2's *merge* clause, for one condition, for two minutes, with automatic restoration.
Recorded in §14.

---

## 9. Devices and trusted devices

Lives in the `my-account` shell layer (`?account=me`), security section. The legacy list already
exists as a read-only display (`:2994`–`:3033`); this makes it real.

```
   ┌─ Active sessions ──────────────────────────────────────────────┐
   │  Chrome on Windows · Riyadh                    [This device]   │  13/600 + neutral badge
   │  176.44.2.19 · Active now                                      │  12px --ev-text-2
   │  Trusted until 12 September 2026        [ Stop trusting ]      │  12px + plain button
   │  ────────────────────────────────────────────────────────────  │  --ev-hairline2
   │  Safari on iPhone · Jeddah                                     │
   │  176.44.9.4 · 2 days ago                      [ Sign out ]     │
   │  ────────────────────────────────────────────────────────────  │
   │                                       [ Sign out everywhere ]  │  secondary
   └────────────────────────────────────────────────────────────────┘
```

| Decision | Ruling |
|---|---|
| **One badge per row, maximum** | `This device` is a **neutral** badge (R7, R15 rounded rectangle). Trusted state is carried by the **line** `Trusted until {date}`, not a second badge. Two badges on a 13 px row is where a list stops being scannable |
| Never a red badge | R5 |
| The IP is rendered | It is the operator's **own** list, which is what makes it defensible. Recorded as **D-A10** — PII on a screen nobody reviewed for it |
| Dates | `formatDate`, numeric run, does not reorder in Arabic; the **cell** aligns inline-start (`rtl.md`) |
| IP addresses | `<bdi dir="ltr">` — a single LTR token, like a plate or an IBAN |

**Confirmations expand in place. There is no modal.** §5.5 forbids a modal nested inside a
no-scrim drawer, and 00-shell §6.4 already took this position for password change and enrolment
inside this same layer. So:

| Action | Confirmation |
|---|---|
| Per-row `Sign out` | The row expands: `Sign out of Safari on iPhone? That device will need your password and a code to sign in again. This device is unaffected.` · `Cancel` · `Sign out`. **Replaces the native `confirm()`** at `:3059` — **D-A9** |
| `Sign out everywhere` | Expands in place, naming the count: `{count} other sessions will end. Every remembered device will ask for a code again.` · `Cancel` · `Sign out everywhere`. **AC-576** — the count is stated *before* it acts |
| `Stop trusting` | **No confirmation.** Recoverable, cheap, and the row's line changes to `Not trusted` immediately. **AC-571** |

| State | Copy |
|---|---|
| `loading` (**AC-651**) | **Skeleton** — three two-line row bars matching the real row shape. Not a spinner |
| `error` (**AC-652**) | `ErrorState`, **`card` scope**, inside this card only; the rest of the account layer still renders · `Couldn't load your sessions. Try again.` + plain button `Try again` |
| empty (**AC-653**) | **`no-match` kind — one grey sentence, no illustration** (R8): `You're only signed in on this device.` This is the `DataTable` empty-kind request from wave 2 §4.7 F-3 biting again |
| per-row action failed | `ErrorState`, **`row` scope**: `Couldn't sign out of this device.` + plain button `Try again`. Every other row stays interactive |

**AC-661 / AC-662:** an operator always sees their own list, with no permission gate; another
account's sessions need `manage_team`.

---

## 10. Onboarding — the guided checklist

Pattern row: **Guided checklist (§5.6) in a shell layer (§5.5, no scrim)**, minted in R4-2 §2.2.
`route.overlay` gains **`onboarding`** and nothing else (R4-3). Reference examined:

### 10.1 Anatomy

```
                    ┌─ 480 ──────────────────────────────────────────────┐  --ev-drawer-w
                    │  Getting started                              ✕    │  48px header
                    │  Ops Manager                                       │  12px --ev-text-2
                    ├────────────────────────────────────────────────────┤  --ev-hairline
                    │  ┌──────────────────────────────────────────────┐  │
                    │  │  You keep trips covered and captains         │  │  --ev-bg2 intro
                    │  │  working — applications, requests,           │  │  card, r8, no border
                    │  │  assurance and dispatch.                     │  │  13/20 --ev-ink
                    │  │  You hold 8 of 13 permissions.               │  │  13/20 --ev-text-2
                    │  │  Work assigned to you arrives in             │  │
                    │  │  Operations › My Work.                    →  │  │  link row
                    │  └──────────────────────────────────────────────┘  │
                    │                                                    │  16
                    │  2 of 7 completed                                  │  12px --ev-text-2
                    │  ▬▬▬▬▬▬▬▬▬▬▬░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │  4px bar
                    │                                                    │  16
                    │  ✓  Check the account that is now yours            │  done
                    │  ✓  Claim one item, then release it                │  done
                    │  ○  Find your own name in the activity log         │  ← EXPANDED
                    │     ┌───────────────────────────────────────────┐  │  --ev-bg2 sub-card
                    │     │ Everything you do here is recorded with    │  │  13/20
                    │     │ your name on it. Read the log once, and    │  │
                    │     │ read who is on call, so you know who to    │  │
                    │     │ reach at 2am.                              │  │
                    │     │                                            │  │
                    │     │ [ Open Activity Log ]   [ Mark as done ]   │  │  primary + secondary
                    │     │ Skip this step                             │  │  12px plain button
                    │     └───────────────────────────────────────────┘  │
                    │  ○  Decide one captain application end to end      │
                    │  ○  Claim, work and dispose of one request         │
                    │  ⊘  Tell a stale feed from a dead one              │  unavailable
                    │     Live Dispatch isn't built yet. This step will  │  12px --ev-text-2
                    │     open when it is.                               │
                    │  ○  Read one suspension appeal from the captain's  │
                    │     side                                           │
                    │                                                    │
                    │  ▸ Skipped (1)                                     │  collapsed group
                    │  ▸ Completed under a previous role (2)             │  collapsed group
                    ├────────────────────────────────────────────────────┤
                    │  Restart onboarding                    [ Dismiss ] │  footer
                    └────────────────────────────────────────────────────┘
```

| Part | Spec |
|---|---|
| Surface | `sheet`, anchored **inline-end**, `--ev-drawer-w` **480 px**, `--ev-shadow-2`, **no scrim** (§5.5). *(00-shell §6.1 says 406; `03-visual-language.md` §1.4 moved the token to 480 under D7 and supersedes it.)* |
| Behind it | The workspace stays **visible, readable and operable** — rail, sub-tab column and top bar all respond (**AC-595**, **AC-596**) |
| Header | Title `Getting started` 13/600, subtitle = the role name 12 px `--ev-text-2`, `✕` at inline-end |
| Route | `?onboarding=1` — an overlay **param**, never a route of its own. Browser Back closes it and stays put |
| One at a time | Opening any other layer closes this one, and vice versa (R4-3 §3.3) |
| `Escape` | Closes and restores focus to the account-menu trigger (**AC-597**, **AC-613**) |
| Closing | Marks nothing complete (**AC-597**) |
| Footer | Present because the layer commits: `Restart onboarding` (plain button, inline-**start**) + `Dismiss` (secondary, inline-**end**) |
| Elevation | Tier 2. It is a drawer, not a modal (`tokens.md`) |

**The intro** — §8.3's three parts, in one `--ev-bg2` card at the top:

1. One sentence of what the role is accountable for.
2. `You hold {held} of {total} permissions.` — key `onboarding.intro.permissions`. **AC-601**:
   for `lina@eyvar.com` it reads **3**.
3. `Work assigned to you arrives in Operations › My Work.` — one shared line, key
   `onboarding.intro.myWork`, with the sub-tab name as a link that opens the route and closes
   the layer.

Where a role is *deliberately* bounded, part 1 carries the boundary. Full copy: §10.5.

**The progress line and bar.**

| Part | Spec |
|---|---|
| Line | `{done} of {total} completed` — §5.6's required format exactly. Key `onboarding.progress`. **AC-602** |
| `total` | Counts **reachable** steps only — built destination **and** permission held (**AC-603**) |
| Bar | 4 px, track `--ev-bg2`, fill **`--ev-ink`**. Not `--ev-blue`: blue's declared roles are focus ring, chart series, selection and a link on white, and it would compete with the expanded step's primary. `--primary` is `--ev-ink` under D7 §1.8 |
| a11y | `<progress>` semantics with the line as its accessible name. The bar is never the sole carrier |

**One expanded at a time** (**AC-604**): `accordion`, `type="single"`, `collapsible`. Only the
expanded step shows its description, its action and its skip control (**AC-605**). On open, the
**first incomplete step** is expanded — which is the graceful degradation §8.4 names, and it
needs nothing from **Q1**.

### 10.2 The step row, in every state

| State | Marker | Title ink | Extra |
|---|---|---|---|
| Not started | `○` 16 px circle, 1 px `--ev-hairline` | `--ev-ink` | — |
| Expanded | `○` | `--ev-ink` 600 | The `--ev-bg2` sub-card below it |
| Done | `✓` 16 px, **`--ev-green`** | `--ev-text-2` | — |
| Skipped | — | — | The row **moves** to the `Skipped (n)` group |
| Unavailable — unbuilt (**AC-609**) | `⊘` circle-slash, `--ev-text-2` | `--ev-text-2` | Reason line beneath, 12 px: `{sub-tab} isn't built yet. This step will open when it is.` |
| Unavailable — forbidden (**AC-610**) | `⊘` | `--ev-text-2` | `This step needs the "{permission}" permission. An owner can grant it in Admin › Team & Access.` |
| Archived | `✓` `--ev-text-2` | `--ev-text-2` | Read-only, inside the archived group |

**R19 is checked and deliberately not spent.** The not-started circle uses `--ev-hairline`, not
`--ev-hairline-strong`, because the step's state is carried by the **`✓` glyph and the ink
weight**, never by the circle's boundary. `--ev-green` on white is 7.098 : 1, so the meaningful
graphic clears 3 : 1 with room. R19 licences `--ev-hairline-strong` for an unchecked
checkbox/radio boundary and *"any second use needs a §6.2 row"* — no second use is taken here.

**No step is hidden** (**AC-611**). Unavailable steps render disabled **in place** with the
reason named — foundation §11.2's rule (*"Disabled actions MUST render greyed in place; do NOT hide actions
that are merely unavailable"*) applied to a checklist. They are **excluded from `total`**.

**The expanded step's controls:**

| Control | Treatment | Copy |
|---|---|---|
| Destination | **Primary** button (`bg-primary` = `--ev-ink`), 32 px `--ev-control-h` | `Open {sub-tab}` — key `onboarding.step.open` `{subTab}`, sub-tab name from the route table |
| Manual completion | **Secondary** button, 32 px | `Mark as done` — §5.6's MUST, on **every** step whether or not it auto-detects (**AC-606**) |
| Skip | 12 px plain button, own line | `Skip this step` |
| `Learn more` | **Not rendered.** `learnMoreKey` is `null` for all 21 steps today | §5.6's SHOULD; there is no help centre and a dead link is worse than an omission. The field is nullable in the fixture (spec §8.9), so this is a content gap, not a design one. **Finding F-2** |

Activating the destination **navigates and closes the layer** (**AC-607**). The step is not
marked done by navigating — only by its `autoSignal` or by `Mark as done`.

**Auto-detection produces no toast.** When a step's `autoSignal` fires because the operator did
the real task — claimed an item in My Work — the step marks done silently. The operator already
got that task's own toast; a second one for a checklist tick is a toast where nothing is needed.
The standing signal is the account-menu entry's `n / m`, which is what R10 routes a standing
condition to. **Stated because an engineer will otherwise add the toast.** (**AC-612**)

### 10.3 Every state in spec §9.2

| State | Surface | Copy — final |
|---|---|---|
| **content** | The layer above | — |
| **`track-empty`** (**AC-631**) | **`no-match` empty — one grey sentence, no illustration** (R8). The intro and progress line are **not** rendered; there is nothing to be `0 of 0` about | `No steps are available for this role yet — an owner can check your permissions in Admin › Team & Access.` |
| **loading** (**AC-650**) | **Skeleton shaped like the step list**: an intro block, a progress bar, seven row bars. Never a centred spinner | — |
| **error** (**AC-649**) | `ErrorState`, **`card` scope**, inside the layer. The layer stays open and dismissible; **the console behind it keeps working** | `Couldn't load your checklist. Nothing has changed.` + plain button `Try again` |
| `step-unreachable-unbuilt` | §10.2 | `{subTab} isn't built yet. This step will open when it is.` — key `onboarding.step.unbuilt` `{subTab}` |
| `step-unreachable-forbidden` | §10.2 | `This step needs the "{permission}" permission. An owner can grant it in Admin › Team & Access.` — key `onboarding.step.forbidden` `{permission}`. **AC-666** |
| `step-mark-failed` (**AC-646**) | `ErrorState`, **`row` scope**, inside that row. The step returns to not-done. **Not a toast alone** — the condition outlives the toast (R10) | `Couldn't mark this step done.` + plain button `Try again` |
| skip / dismiss failed (**AC-647**) | Same row-scoped treatment; state unchanged | `Couldn't skip this step.` / footer-scoped `Couldn't dismiss the checklist.` + `Try again` |
| `completed` (**AC-635**) | The step list **collapses to a done line** — reference: the inherited capture — and `Dismiss` takes primary emphasis in the footer | `✓ Done` (12/600 `--ev-green`) + one sentence: `You've finished the {role} checklist. Reopen it any time from your account menu.` |
| `dismissed` (**AC-637**, **AC-638**) | Layer closes. Account-menu entry stays, **without a count indicator**. Never auto-opens again, never raises a banner again | — |
| `role-changed` (**AC-643**) | **One `shell` banner**, `info` tone, dismissible. **The layer never auto-opens** — the operator may be mid-task | `Your role changed to {role}.` + secondary button `Open checklist`. Key `onboarding.roleChanged` `{role}`, role itself a key |
| `archived-steps-present` (**AC-644**) | A collapsed `collapsible` at the foot, read-only rows, **excluded from `total`**, **not deleted** | `Completed under a previous role ({count})` — key `onboarding.archived` `{count}` |
| `stale-state` (**AC-648**) | The layer re-reads and re-renders. If the operator's action is still valid it applies; if it is not, an inline 12 px line in that row. **No banner** — a two-tab race is not a page condition | `This step was already completed in another tab.` |

### 10.4 Dismiss, skip, resume, restart, role change

| Action | Behaviour | Confirmation |
|---|---|---|
| **Skip a step** | **There is no Skip control.** A step is done or it is not done, and there is no `Skipped` group. The data layer keeps `skipStep` and `skippedStepIds`; the UI never writes them. Withdrawn by the owner along with AC-632, AC-633 and AC-634 | — |
| Progress | `{done} of {total} completed` counts completed steps | — |
| **Track complete** | Every reachable step done → `completed` state (§10.3) | — |
| **Dismiss** | Available **at any time**, not only at completion (**AC-636**). A deliberate extension of §5.6, which only makes a *completed* guide dismissible: an operator on their first shift can be handed a live safety incident in minute four, and a checklist they cannot close is a trap. §5.6's *"MUST NOT resurrect it afterwards"* is honoured exactly — no auto-open, no banner, ever again | **None** |
| **Resume** | The account-menu entry is permanent, for every role (**AC-598**) | — |
| **Restart** | `Restart onboarding` clears completions **for the current track only**, un-dismisses, and re-renders at `0 of {total}` (**AC-640**). Also available to a `manage_team` holder against another operator from Admin › Team & Access (**AC-641**) | **None** |
| **Role change** | The new track is computed. Step ids present in **both** tracks and already completed **stay completed** — steps 1–3 are shared, so nobody redoes them (**AC-642**). Steps the new role cannot reach are **archived, not deleted**: a demotion must not read as regression. One banner, never an auto-open (**AC-643**, **AC-645**) | — |

**No confirmation modal on any of these, and one clause decides it:** §5.5 forbids a modal
nested inside a no-scrim layer, and 00-shell §6.4 already took that position for this layer
family. The secondary argument is that nothing of value is destroyed — a restarted checklist is
training to redo, not a record to lose — and `Dismiss` does not even remove the layer from
reach (**AC-638**).

**The account-menu entry.**

```
   Layla Al-Qahtani
   Ops Manager
   ─────────────────────────
   Getting started    2 / 7      ← 12px --ev-text-2 at inline-end
   My profile
   Switch user
   ─────────────────────────
   Sign out
```

Present at all times, for every role (**AC-598**). Carries `{done} / {total}` while the track is
incomplete **and** undismissed; **no indicator otherwise** (**AC-599**). Label `Getting started`,
key `onboarding.menuEntry`.

**Auto-open, exactly once** (**AC-594**): on the first session of an account with no onboarding
state, **after the landing route's first successful data render** — not before, because opening a
layer over a skeleton is noise. Activating from an invite lands the operator on their landing
route with the layer open (**AC-593**).

**Not a tour, and not an empty state.** §5.6's last MUST forbids coach marks, spotlights and
modal wizards (**AC-615**). R8's first-run empty means *nothing has ever existed here*, and wave
2's **E1 `queue clear`** prohibition (Q-36) is exactly right: a training checklist at the moment
an operator finishes their queue is the opposite signal (**AC-614**).

### 10.6 The welcome, and the beacon

Three positions in `DESIGN.md` yield to the owner's standing override, and only this far. The
override is recorded in `docs/RULINGS.md`; this section is its design.

**The welcome dialog** (`WelcomeDialog.tsx`). **One** modal, **four** slides, shown **once per
account** on the first session and never again, stamped by `autoOpenedAt`. Closing it by any
route — `Not now`, the close control, `Escape`, an outside click — counts as seen.
`Start the checklist` opens the layer. This is the only licence §5.6's "MUST NOT use modal
wizards for onboarding" yields, and it licenses no other wizard, tour, coach mark or spotlight.

| | |
|---|---|
| Layout | split: the picture at inline-start in a 3:2 frame at three fifths of the width; eyebrow, title, body and any extra line at inline-end, vertically centred. Arabic mirrors it |
| Slide 1 | what Eyvar is and what your role reaches. Eyebrow `Eyvar Admin`, title `Welcome, {firstName}` — the **first** name; the full name stays in the account menu |
| Slide 2 | My Work, shown as a capture of the product itself |
| Slide 3 | the command centre, shown as a capture |
| Slide 4 | the operator's own checklist, with the step count, over the role's own picture |
| The role sentence | *Your role reaches Management, Operations, Financials, Support, and Admin*, built from `visibleWorkspaces` through `Intl.ListFormat`, so a Support operator is never told they reach Financials (**AC-916**) |
| Captures | 3:2 crops in both colour themes, chosen at render time by `useTheme` |

**Why four slides and not five.** Each extra slide loses a share of the people still reading,
and the checklist's own `common.audit` step already takes the operator to the activity log. A
slide is justified only when nothing else in the product will teach the same thing.

**The beacon** (`OnboardingBeacon.tsx`). A **48px progress ring** with the completed percentage
inside it (`formatPercent`, rounded), fixed **24px from each edge** at the bottom inline-end
corner. It is present only while the track is incomplete, undismissed, and the layer is closed,
and it is **absent on the compact shell**. It raises no toast and no banner.

Activating it opens a **320px popover above it**: the title, `n of m completed`, the
percentage, the step list with a tick on each done step, and two plain actions —
*Open the full checklist* and *Hide until next sign-in*. A step in the panel goes straight to
its screen; a done step, or one with no screen, opens the layer on it instead.
`destinationPath` lives in `destination.ts` so the panel and the layer resolve a step the same
way.

`Hide until next sign-in` hides the beacon **for the session only**. R10's "one event, one
surface" yields exactly this far: the checklist has **two** standing surfaces, the account-menu
entry and the beacon, and no third.

**The layer is quiet.** No sub-card behind the expanded step: body text in the muted ink, one
primary `Open`, `Mark as done` as a plain button, and the picture at inline-end. No group
labels. The intro picture is 112x80.

**Illustration.** R8 ("an illustration appears only on a whole-page, zero-records-ever empty
state") yields for the guide only: a guide's intro card, its expanded task and its completed
state may each carry a **decorative** illustration. Empty states are unchanged, and
`track-empty` and E1 still carry none.

### 10.7 The illustration set

**Files.** `docs/05-restructure/design/onboarding-illustrations/source/` holds the 26 subjects;
the shipped components are one per subject under `src/screens/onboarding/illustrations/`,
exported through a map keyed by step id and role name.

**The style is flat two-tone**: brand-green fills, ink outlines, pale brand-green tints, white
ground. It is chosen because it survives the reduction to 96px — a tinted shield, a code slot
and a ticked list are all still readable there — and because it sits inside a `--ev-bg2` card
without needing a frame. A monoline outline style was tried and declined: below roughly 150px
the drawing dissolves into lines, and a technical diagram is closer to the product's own icon
set than to a picture, so it adds nothing the icons do not.

**Two rules on what a drawing may contain.**

- **No arrows and no cursors.** An arrow encodes a reading direction, and art is never mirrored
  with CSS (O10).
- **No digits and no text.** A code slot renders empty, which is correct: any glyph inside a
  drawing is a string that cannot be translated.

**Where the art appears.**

| Surface | Art | Size | Rule |
|---|---|---|---|
| The expanded step | that step's illustration at the inline-end of the description, above the buttons on narrow widths | 96 x 64 | decorative: `aria-hidden`, `focusable="false"`, no `<title>` |
| The intro card | the role's illustration at the inline-end | 112 x 80 | one per role, four in total |
| The completed state (AC-635) | the completion illustration above the done line | 160 x 106 | the one hero-sized picture, because it is the one moment |
| Collapsed rows, the archived group, the account menu, the banner | **none** | — | a picture per row is noise; the row's job is scanning |
| Any empty state, including `track-empty` | **none** | — | R8 and Q-36 unchanged |

**The test that keeps it decorative:** remove every SVG and every acceptance criterion still
passes. The art carries no meaning the text does not.

**Five fills, and only five.** A drawing enters the tree tokenised. Any fill outside these five
is a rejected image:

| Source fill | Becomes |
|---|---|
| `rgb(12,105,68)` | `fill-primary` |
| `rgb(23,26,33)` | `fill-foreground` |
| `rgb(231,240,236)` | `fill-brand-lt` |
| `rgb(255,255,255)` | `fill-background` |
| `rgb(107,114,128)` | `fill-muted-foreground` |

Every one of those is a theme colour in `globals.css`, and the edit gate's literal-colour check
forces the substitution. Before tokenising, a drawing is stripped of its provenance metadata
block and of its `style`, `width`, `height` and `preserveAspectRatio` attributes. Budget: 12 KB
per file, about 300 KB on the onboarding chunk, which is lazy-loaded. `scripts/illustrations/`
does the strip and the substitution, so a new batch is one command.

### 10.5 The four tracks — 21 steps, final copy

**Steps 1–3 are byte-identical across all four tracks, by step `id`** (**AC-618**). Four tracks,
one per role in `TEAM_ROLES`, **no default and no fallback** (**AC-617**).

**Intro sentence, per role** (§8.3 part 1):

| Role | Sentence | Key |
|---|---|---|
| Owner | `You're accountable for the whole console — policy, people, money, and the decisions nobody else can make.` | `onboarding.intro.owner` |
| Ops Manager | `You keep trips covered and captains working — applications, requests, assurance and dispatch.` | `onboarding.intro.opsManager` |
| Finance | `You move money and account for it — payouts, escrow, deductions and reconciliation. You can see profiles, and you cannot change a captain's status.` | `onboarding.intro.finance` |
| Support | `You answer riders and captains, and you're the first person to hear when something goes wrong. You can see a safety incident and you cannot decide one — an Ops Manager does that.` | `onboarding.intro.support` |

Support's second sentence is load-bearing (§8.5): with three permissions the role is not
equipped for a suspension decision, and the boundary is more useful on day one than the
capability list.

**Common — all four tracks.**

| id | Title | Body | Destination | Completion |
|---|---|---|---|---|
| `common.account` | `Check the account that is now yours` | `Confirm the number your codes go to, then review your active sessions and end anything you don't recognise.` | `my-account` layer, security section · button `Open my profile` | manual |
| `common.mywork` | `Claim one item, then release it` | `Operations › My Work is where every queue reaches you. Claim something from Unassigned and release it again, so you learn what a claim is before you're holding six.` | `operations/my-work?view=unassigned` · button `Open My Work` | auto — `queue.item.claimed` |
| `common.audit` | `Find your own name in the activity log` | `Everything you do here is recorded with your name on it. Read the log once, and read who is on call, so you know who to reach at 2am.` | `admin/activity-log` · button `Open Activity Log` | manual |

**Owner — 3 common + 4 = 7** (**AC-619**).

| id | Title | Body | Destination |
|---|---|---|---|
| `owner.team` | `Read the role matrix, and decide if it still holds` | `One account holds manage_settings, and that key gates 39 of the console's 131 permission checks. Decide whether that is still acceptable.` | `admin/team` · `Open Team & Access` — **AC-620** |
| `owner.policy` | `Read the policy you are accountable for` | `Dispatch radius, operating limits, SLA targets and reason codes. Read them once, deliberately, rather than the first time one is disputed.` | `admin/operational-policy` · `Open Operational Policy` |
| `owner.position` | `State the current contribution margin` | `The trial balance and the contribution margin are the two numbers you'll be asked about. This is where they live, and this step is done when you can say them out loud.` | `financials/overview` · `Open Financials overview` — **overrules AC-630, §15** |
| `owner.pricing` | `Settle how captains are paid` | `The console computes captain earnings four different ways and nobody has chosen one. That decision is outstanding, and it is yours.` | `financials/pricing` · `Open Pricing & Plans` — **AC-621** |

**Finance — 3 common + 5 = 8** (**AC-622**).

| id | Title | Body | Destination |
|---|---|---|---|
| `finance.ledger` | `Read a ledger before you post to one` | `Learn the sign convention, and learn that a posted row is never edited — it is reversed by a second row. Nothing in Financials undoes itself.` | `financials/revenue?view=all-postings` · `Open Revenue & Refunds` — **AC-623** |
| `finance.escrow` | `Read what releasing escrow does, without releasing it` | `Open one escrow row and read it through. Release moves money to a captain, and there is no undo — only a reversing entry.` | `financials/payouts?view=escrow` · `Open Payouts & Escrow` |
| `finance.reconciliation` | `Work one reconciliation item end to end` | `Claim it, decide it, and watch the row convert in place. This queue is how cash and captain debt stay true to each other.` | `financials/cash?view=reconciliation` · `Open Cash & Captain Debt` · auto — `queue.item.disposed` |
| `finance.goodwill` | `Find the cap that bounds a goodwill credit` | `You and Support share one compensation cap. Find the number before a rider asks you to go past it.` | `financials/rider-wallets?view=goodwill` · `Open Rider Wallets` |
| `finance.routing` | `Know which queue reaches you` | `Disputes route to Finance. Turn role routing off once in My Work and see what changes, so you know what you're filtering out.` | `operations/my-work` · `Open My Work` |

**Ops Manager — 3 common + 5 = 8** (**AC-624**).

| id | Title | Body | Destination |
|---|---|---|---|
| `ops.application` | `Decide one captain application end to end` | `Read the documents, then approve or reject. The row gives you a tick, a cross and View — there is no menu to open.` | `operations/people?view=applications` · `Open People` · auto — `application.decided` (**D8**) |
| `ops.requests` | `Claim, work and dispose of one request` | `Watch the SLA clock while you hold it. Read what a breach means — a breach is a missed target, not a failure to act.` | `operations/requests` · `Open Requests` · auto — `queue.item.disposed` — **AC-625** |
| `ops.assurance` | `Cover one trip before it departs` | `Trip Assurance lists subscriptions with no backup captain. Register or replace a captain on one of them.` | `operations/trip-assurance?view=no-backup` · `Open Trip Assurance` |
| `ops.dispatch` | `Tell a stale feed from a dead one` | `Live Dispatch shows a freshness line. Learn the difference between data that is late and data that has stopped, before you act on either.` | `operations/live-dispatch` — **unbuilt, wave 6.** Renders disabled in place; becomes enabled with no fixture change (**AC-626**) |
| `ops.fairness` | `Read one suspension appeal from the captain's side` | `Captain Fairness shows you the economics a suspension takes away. Read one before you're asked to answer for a decision.` | `support/captain-fairness` · `Open Captain Fairness` |

**Support — 3 common + 4 = 7** (**AC-627**).

| id | Title | Body | Destination |
|---|---|---|---|
| `support.ticket` | `Answer one ticket end to end` | `Open it, respond, and resolve it with a reason code. The reason code is what makes a ticket countable later.` | `support/tickets` — **unbuilt, wave 5.** Disabled in place |
| `support.profile` | `Open a 360° profile, and know what you may not do with it` | `One profile carries every piece of personal data the console holds about a person, across 11 record types. Open it only when the work in front of you needs it.` | `profile` layer, from any rider or captain · `Open a rider profile` |
| `support.goodwill` | `Credit a rider, inside your cap` | `This is the one money action you take mid-call, and it's bounded by policy. Find the cap before you need it.` | `financials/rider-wallets?view=goodwill` · `Open Rider Wallets` |
| `support.boundary` | `Know what you may not decide, and who does` | `You can see every safety incident and you cannot decide one — an Ops Manager does. Read one incident, and stop there.` | `support/safety`, **read-only** · `Open Safety & Incidents` — **AC-628** |

**Checks.** **AC-629** — no step is satisfiable by *"look at this screen"*; each names an action
performed or a fact statable afterwards. **AC-608** — every `subTabId` must exist in
`routeTable.ts`, checkable as a diff. **AC-630** — one named exception, `owner.position`, §15.
**D4 is a data edit** (spec §8.6): the tracks are fixtures keyed by `RoleName` and adding two is
two new rows, not a redesign.

---

## 11. Copy — the strings that cannot be concatenated

Every string in §3–§10 is final and keyed. The ones foundation §7.5 rule 2 would otherwise
break, each as **one key with named placeholders** (**AC-670**, **AC-671**):

| Rendered | Key | Note |
|---|---|---|
| `Wait 12 minutes, then sign in again.` | `auth.lockout.retryIn` `{minutes}` | **Plural rule.** Arabic has six forms; this can never be `n + ' minutes'` |
| `Resend code in 27s` | `auth.otp.resendIn` `{seconds}` | Plural rule |
| `2 resends left before you'll need to sign in again.` | `auth.otp.resendsLeft` `{count}` | Plural rule |
| `Sent to ••••••67` | `auth.otp.sentTo` `{hint}` | The masked run is a **numeric run** — `<bdi dir="ltr">`, no reorder (**AC-675**) |
| `You were inactive for 30 minutes. Sign in to continue.` | `auth.session.endedIdle` `{minutes}` | Plural rule |
| `Your session ends in 2 minutes.` | `session.idleWarning` `{minutes}` | Plural rule, and a `less than a minute` form |
| `4 other sessions ended, and every remembered device will ask for a code again. Sign in with your new password.` | `auth.reset.done` `{count}` | Plural rule **with an explicit `=0` form** (§7.5) |
| `3 other sessions will end. Every remembered device will ask for a code again.` | `auth.devices.signOutAllConfirm` `{count}` | Plural rule |
| `2 of 7 completed` | `onboarding.progress` `{done}` `{total}` | §5.6's required format |
| `Skipped (1)` | `onboarding.skipped` `{count}` | |
| `Completed under a previous role (2)` | `onboarding.archived` `{count}` | |
| `Your role changed to Ops Manager.` | `onboarding.roleChanged` `{role}` | **Role names are keys** (`role.opsManager`), never English literals interpolated into Arabic |
| `You hold 3 of 13 permissions.` | `onboarding.intro.permissions` `{held}` `{total}` | |
| `You've been invited to Eyvar as Support.` | `auth.activate.subtitle` `{role}` | Same rule |
| `The "manage_team" permission was removed while you were editing. …` | `session.writeRevoked` `{permission}` | |
| `Live Dispatch isn't built yet. This step will open when it is.` | `onboarding.step.unbuilt` `{subTab}` | Sub-tab name from the route table, itself a key |
| `Open My Work` | `onboarding.step.open` `{subTab}` | Same |
| `Use +966 55 123 4567 from your profile` | `auth.enroll.usePhone` `{phone}` | `<bdi dir="ltr">` |
| `For fahad@eyvar.com` / `Signed in as fahad@eyvar.com` | `auth.reset.forAccount` / `auth.reauth.signedInAs` `{email}` | `<bdi dir="ltr">` |
| `Sign out of Safari on iPhone?` | `auth.devices.signOutConfirm` `{device}` | |
| `Trusted until 12 September 2026` | `auth.devices.trustedUntil` `{date}` | `formatDate`; numeric run |

**Compliance checks across every string above.** Sentence case (**AC-680**) · every button label
a verb or verb + object, with only `Cancel` used as a permitted non-verb (**AC-680**) · no
`please`, `invalid`, `failed`, or exclamation mark anywhere (**AC-656**) · no emoji (**AC-672**)
· no message blames the operator; each states the condition and the next action (**AC-657**) ·
full sentences take a period, fragments and titles do not (**R6**) · **AC-581** — every error
state offers a retry or a stated next action, and none is a dead end.

**Audit labels.** Every event in spec §12.3 needs an `ACTION_LABELS` entry, or it is unreachable
from the Activity Log's filter (`00c` **F2**). Sentence-case labels, final:
`sign_in` → `Signed in` · `sign_in_failed` → `Sign-in rejected` · `challenge_locked` →
`Verification locked` · `second_factor_enrolled` → `Verification set up` ·
`password_reset_requested` → `Password reset requested` · `password_reset_completed` →
`Password reset` · `invite_activated` → `Invite activated` · `device_trusted` →
`Device trusted` · `device_revoked` → `Device signed out` · `signed_out` → `Signed out` ·
`signed_out_everywhere` → `Signed out everywhere` · `onboarding_completed` →
`Onboarding completed` · `onboarding_dismissed` → `Onboarding dismissed` · `onboarding_reset` →
`Onboarding restarted`.

---

## 12. Arabic (§9)

Every rule in this document is stated in **inline-start / inline-end**. Nothing depends on left
or right.

| Element | Mirrors? | Note |
|---|---|---|
| The card, its fields, its buttons, the legal row | **Yes** | The card is centred, so only its internal alignment moves |
| The wordmark **pair** | **Yes** — mark then word, both at the card's inline-start | The mark **glyph** does not mirror (`rtl.md`, logos) |
| **The 6-digit code input** | **No, and it does not need to.** `text-align: center` + `dir="ltr"` | §4.1 D-OTP-7. **AC-537 / AC-674** pass by construction: typing `1` then `2` produces a code beginning `12` in both languages, in the same visual position |
| The masked destination `••••••67` | **No** | `<bdi dir="ltr">`, a numeric run (**AC-675**) |
| Email addresses, IP addresses, phone numbers, the TOTP secret | **No** | Single LTR tokens; each in `<bdi dir="ltr">` or a leading `+` jumps sides |
| The QR code | **No** | Media glyph (`rtl.md`) |
| The strength meter's fill direction | **Yes** | It fills from the inline-start. A progress bar is a reading-direction quantity, not a numeric run |
| The onboarding layer | **Yes** — anchors inline-end, enters with `−X` in RTL (§9.5) | 00-shell §6.1 |
| The step marker column | **Yes** — markers at inline-start | |
| The re-auth modal | **Yes**; `Cancel`-slot button before the primary in reading order | |
| Elevation | **No** — all three tiers are `offset-x: 0` (`tokens.md`) | Nothing goes under `:root:lang(ar)` |
| Field and control heights | **Yes, they grow.** `--ev-control-h-lg` 40 → **44** under `:root:lang(ar)` | `03-visual-language.md` §1.7 |

**The 400 px card does not widen in Arabic.** Only the eight dimensions in §1.7 step up, and the
card is not one of them. Checked against the longest Arabic string on the surface — the reset
success body — which wraps to five lines at 336 px and does not overflow (**AC-673**).

**AC-616 / AC-669:** every operator-facing string resolves through a key. Rendering with an empty
Arabic dictionary shows English for every one of them and never a raw key.

---

## 13. Keyboard and focus

| Screen | Tab order |
|---|---|
| `signin` | banner action (if any) → email → password → reveal → `Forgot password?` → `Remember this device` → `Sign in` → `Privacy` → `Terms` |
| `signin-verify` | banner action → code field → `Verify` → `Resend code` → `Use a different account` → legal |
| `signin-enroll` | banner action → radio group (**one** stop; `↑ ↓` move) → phone → suggestion → `Send code` → `Sign out` |
| `reset-password` | banner action → new password → reveal → confirm → reveal → `Reset password` |
| re-auth modal | **trapped**: password → reveal → `Sign out` → `Sign in` |
| onboarding layer | close `✕` → intro link → each step header (**one** stop per row) → the expanded step's primary → `Mark as done` → `Skip this step` → group headers → `Restart onboarding` → `Dismiss` |

| Key | Behaviour |
|---|---|
| `Enter` in any auth field | Submits the card's primary — **once**. Never toggles a reveal, never fires a resend (**AC-509**) |
| `Escape` on an auth **screen** | Nothing. There is no surface to close |
| `Escape` in the **re-auth modal** | **Nothing.** `alert-dialog` (R4-3) |
| `Escape` in the **onboarding layer** | Closes, returns focus to the account-menu trigger (**AC-597**, **AC-613**) |
| Focus on layer open | Moves into the layer, **does not trap** — no scrim (§7.3.3, R4-9) |
| Focus on modal open | Moves to the password field, **traps** — there is a scrim |
| `prefers-reduced-motion` | The layer enters instantly; the resend countdown is a text change and is unaffected; nothing loops (**AC-69**) |

**Visible focus on everything interactive** (**AC-676**), including both reveal controls, the
resend button, the suggestion button, every step header and every group header. `outline: none`
without a `focus-visible` ring is a defect (§7.2).

**Every screen is completable using only the keyboard** (**AC-677**), and every icon-only control
has an accessible name: `Show password` / `Hide password`, `Close`, and the step markers, which
are decorative and therefore `aria-hidden` with the state carried by the row's accessible name
(`Check the account that is now yours, completed`).

**Every error is announced, not only rendered** (**AC-678**): banners take `role="alert"` when
they announce a rejection and `role="status"` when informational; inline field errors are
`aria-describedby` from their field with `aria-invalid="true"`; the strength caption is
`role="status"`.

---

## 14. Deviations

Each names the rule it suspends. Nothing here needs a signature; §16 says why.

| # | Deviation | Rule suspended | Why |
|---|---|---|---|
| **A-1** | The idle-warning shell banner **replaces** any other shell banner for its two-minute life instead of merging into a count | §5.2's **merge** clause, as condensed in 00-shell §4.2 | Every other shell condition is indefinite; this one has a deadline. Folding a deadline into `2 conditions need your attention.` destroys the only information it carries. **R10's invariant — one banner — is untouched**, and the displaced condition is restored automatically |
| **A-2** | The auth card's two-condition case is resolved by **precedence**, not by a merged count (§2.3) | §5.2's merge clause | An auth card has at most two conditions and only one is ever actionable. *"2 conditions need your attention"* on a sign-in screen is worse copy than the sentence it replaces. Still one banner |
| **A-3** | The verification-code field's value is **centred** | §4.2's inline-start value alignment | One field, and it is the only alignment that renders identically in both languages. This is what makes **AC-537 / AC-674** pass by construction rather than by care (§4.1 D-OTP-7) |
| **A-4** | The verification-code field has **no placeholder**, against the inherited capture's `000000` | D14's *structure from the inherited flow* | §4.2 permits a placeholder only as a format example; at 17 px tabular in a 336 px field, six zeros are indistinguishable from a value. The helper text carries the format instead |
| **A-5** | The **inset/floating label** recorded in §4.2 *"(auth surface only)"* is **not adopted** | §4.2's own observation | It exists in the inherited auth and nowhere else in that admin, and it forces a second field anatomy in a product with exactly one. D14 sends the **flow** to the inherited baseline, not the form primitive |
| **A-6** | `Dismiss` is available **before** completion | §5.6's *"a completed guide is dismissible"* | The spec's §8.8 extension, upheld. An operator on their first shift can be handed a live safety incident in minute four, and a checklist they cannot close is a trap. §5.6's *"MUST NOT resurrect it afterwards"* is honoured exactly |
| **A-7** | No step renders a `Learn more` link | §5.6's `SHOULD end each task description with a "Learn more" link` | It is a SHOULD, there is no help centre, and a dead link is worse than an omission. `learnMoreKey` is nullable by design (spec §8.9). **AC-605 now fails if a link renders**, and the content gap is **Q-82**. **Finding F-2** |
| **A-8** | `Restart onboarding`, `Dismiss`, `Skip` and `Stop trusting` take **no confirmation** | §5.0's *destructive → modal* row | §5.5 forbids a modal nested inside a no-scrim layer, and 00-shell §6.4 already took this position for this layer family. Nothing irreversible is destroyed |
| **A-9** | The auth screens use `--ev-control-h-lg` (40 px), not the 32 px compact control | **Nothing.** Recorded here only because it will read as one | The token's declared job. Density is a decision for a screen holding forty controls; this card holds two. §4.2's *one field height per surface* is honoured — every field on the card is 40 |

**Deliberately *not* deviations, checked and confirmed in force:** R5a (§2.4 — use #2, no fifth
red) · R7 (one badge on the device row, tone `neutral`) · R8 (`track-empty` and the empty device
list are both one grey sentence) · R10 (one surface per event, everywhere) · R15 (badges rounded
rectangles) · R19 (**not spent** — §10.2) · §5.5 (no scrim, no nested modal) · §7.3.3 (the scrim
decides the trap).

---

## 15. Seven overrules, and two I mis-filed

**Seven.** Each is a spec edit for **product-owner**, written as it should read. Two more were filed here as overrules and were not — §15.1, conceded.

| # | Clause | Overruled to | Why |
|---|---|---|---|
| **1** | **AC-503** — *"…a full-width primary, a `Forgot password?` link, and the legal link row"* | *"…password field, a `Forgot password?` link, `Remember this device`, a full-width primary, and the legal link row"* | Two reference frames put the link between the field and the button, D14 sends card order to the inherited flow, and it is the control an operator reaches for the second after the primary failed — below the primary it sits under the fold a banner re-render pushes down (§1.3) |
| **2** | **§12.2**'s example `Sent to ••• ••• 4567` | `Sent to ••••••67` | **AC-519** forbids more than the last two digits. The criterion binds; the illustrative string was written against a four-digit habit (§4.2) |
| **3** | **AC-567** — *"Attempting to sign in as a different operator from the re-authentication layer is **refused**, with an instruction to sign out first"* | *"The re-authentication surface has no identifier field. The account is displayed as text, bound to the expired session's `userId`, and `Sign out` is the named path to a different account. The dirty form is untouched by either."* | A refusal is a check that can be forgotten; an absent field cannot be. `00c` **F5** is what happens when that check is missed once (§8.2). **My mechanism was taken; my criterion wording was not, and rightly** — *"the surface has no identifier field"* asks QA to prove a negative, and it describes the **surface** while the risk lives in the **operation**, so it goes green on a build where `auth.reauthenticate` has already been widened. The shipped criterion is a closed control inventory plus two invariants: **the request carries no operator-supplied identity, and the returned session's `userId` is the expired one's.** That is the testable form of §8.2 and it is what the design means |
| **4** | **AC-630** — *"No track contains a step whose destination is a workspace Overview"* | *"No track contains a step whose destination is a workspace Overview, with exactly one exception — `owner.position`, whose named facts (the trial balance and the contribution margin) exist on no other sub-tab. Any other step naming an Overview fails this criterion."* | The spec's own §8.5 gives Owner step 6 that destination, so the spec contradicts itself. AC-630 exists to stop *"explore the dashboard"* steps, which `owner.position` is not — it names two numbers the operator must be able to state (§10.5), and a `bodyKey` fixture string cannot carry a live trial balance, so banning the destination deletes the numbers. **The shipped criterion tightened my carve-out and is better than it:** a closed allow-list of one step id, plus a new clause — *no step's destination is the operator's own `session.landingRoute`*. That makes the exception principled rather than special: `financials/overview` **is** Finance's landing route and **is not** the Owner's. All 21 steps in §10.5 already satisfy it |
| **5** | **§4.1 row 7** — `reauthenticate` as a *"shell layer, no scrim"* | A **modal**, `alert-dialog`, 440 px | Already ruled in **R4-3**; restated because the spec table still says layer |
| **6** | **§9.1** — the state list | Add **`challenge-missing`** and **`challenge-completed-elsewhere`** | Both are required by criteria the spec already carries (**AC-582**, **AC-531**, **AC-583**) and neither has a named state to be designed against (§4.5) |
| **7** | **AC-540** — *"an in-card banner between the heading and the field"* | Clarification, not a change: *"…on the `/signin` card, in its banner slot between the subtitle and the identifier field"* | The inherited capture shows the confirmation on the login card. Under D14 that placement is structure (§7.1) |

---

### 15.1 Two I filed as overrules that were not

Raised by the coordinator, checked against the spec's own sentences rather than conceded on
trust, and **conceded on both**.

| Was #8 | **§6.2's tone.** I recorded *"the tone is `info`, not `success`"* as an overrule. §6.2 line 418 reads: *"under D14 that placement is structure, so it is kept **while its colour is not**."* **The spec ceded colour in the same sentence I claimed to be overruling.** I exercised a boundary it drew. Not an overrule |
|---|---|
| Was #9 | **§5.2's focus rule.** I recorded *"focus moves on paste only, never on typing"* as narrowing the spec. §5.2 begins *"Pasting a 6-digit string…"* and says nothing about typing at all — and its own argument, *"an auto-submit on the sixth character"*, already reasons about typing without ruling on focus. **It was silent, not wrong.** Filling a silence is not overruling it |

**Why this is worth correcting rather than shrugging at.** Nothing built moves either way. What
moves is what a reader infers from *"nine overrules"* — that two documents were written by people
who disagreed nine times. They disagreed seven times. A spec and a design spec that agree are
worth more than a design spec that looks decisive, and inflating the count spends the credibility
of the seven that are real.

**One nuance I am keeping, because it is a definition and not a defence.** §6.2's phrase *"its
colour is not [kept]"* has two readings: the **value** (don't import an inherited green hex) and the
**tone assignment** (don't use the success tone at all). I took the second. A future designer who
takes the first lands on Eyvar's own `success` green and rebuilds the exact contradiction §7.2
removes — a green tick over a conditional sentence. **So: in these documents, "colour" covers tone
assignment, not only the palette value.** That belongs written down once, and this is the once.

---

## 16. Findings — raised, not decided by me

| # | Finding | Who | Blocks |
|---|---|---|---|
| **F-1** | **The §4.4 inline field error is a fifth use of red, and one of its three signals has never existed.** Filed as **§6.2 D-14** — §6.2 runs D-1…D-11 (`DESIGN.md:3357`) and D-12/D-13 are the unsigned proposals ahead of it; `DECISIONS.md`'s D-numbers are a separate register and do not consume §6.2's. **Recommendation: sign it as two signals, not three** — full working, the cost of declining, and my challenge to the framing are in **§16.1** | product-designer + business owner, as a §6.2 entry | **Nothing.** Every screen in this document ships the border-plus-message treatment the codebase already has |
| **F-2** | **`Learn more` has no destination.** §5.6 SHOULDs a `Learn more` link on every guide task; `copy.md` rule 11 gives its exact form. Eyvar has no help centre, so all 21 steps ship `learnMoreKey: null`. This is a content gap, not a design one, and it is why §10.2 renders nothing rather than a dead link. **Now tracked as Q-82**, and AC-605 was inverted on the spec side to fail if a link renders — so the absence is enforced rather than merely tolerated | product-owner, **Q-82** | Nothing. `learnMoreKey` is already nullable in the fixture (spec §8.9) |
| **F-3** | **CLOSED, this pass.** `copy.md`'s exact-wording row read `Enter a valid email address` with no period; R6 is a ruling and beats a lookup file, and `00-shell.md` §10.4's own example always carried one. Edited: the row now reads `Enter a valid email address.` and rule 8 gained the clause that an inline field error is a sentence. QA now checks one spelling of one string | product-designer — **done**, `docs/ref/copy.md` | Nothing |
| **F-4** | **Q-78 is unanswered and AC-663 fails visibly.** No `manage_security_policy` key exists, so the screen naming the gate on the idle timeout, the trusted-device window and the enrolment policy names a permission that is not in the built set. **I have not designed around it** — the Admin › Team & Access pane that carries those three settings is wave 7 and is not in this document. Recorded so the failure is expected rather than discovered | business owner, as part of **D4** | **AC-663**, already recorded as known-failing |
| **F-5** | **Q4 is unanswered, so every `requiredPermission` is `null`.** §10.2's `step-unreachable-forbidden` treatment is designed, keyed and copied — and unreachable until the 34 sub-tab permissions land. `newrole@eyvar.com` reaches `track-empty` through zero permissions, not through a forbidden step, so **AC-631 passes and AC-610 cannot** | business owner | **AC-610** |
| **F-6** | **Shipping authentication in front of a one-click RBAC bypass is theatre.** `commitUserSwitch` (`:3098`) has no `requirePerm` and no confirm, and `logAction` then attributes actions to the impersonated user (`:3138`) — `00c` **F3** and **F5**. Out of scope here by spec §2.2, and restated because §8.2's whole design exists to stop the *same* misattribution arriving through a new door | product-owner, as a wave-7 blocker | Nothing here |

### 16.1 §6.2 D-14 — the inline field error. Two clauses, and only one of them is bookkeeping

**Four sources, four answers, and the coordinator's audit found the part I missed.**

| Source | What it says |
|---|---|
| **R5a** (`DESIGN.md:277`) | Red has **four** uses. The inline field error is not one of them. A fifth needs a §6.2 entry |
| **§4.4 / `00-shell.md` §10.4** | **Three** signals, all required: 1 px `--ev-red` border **and** `--ev-red-lt` fill **and** a 12 px iconed message |
| **`globals.css:585`, `:954`** | `--ev-red-lt` is *"critical banner fill"*; `--tone-critical` is *"banners only (R5a use #2)"* |
| **The code** | **Two** signals. Eight primitives carry `aria-invalid:border-destructive`; `--ev-red-lt` appears in `src/` **only inside comments** — `input.tsx:22` and `field.tsx:12` both quote the MUST that neither file implements |

**§10.4's MUST has never been met.** Not once, on any surface, since the primitives were
restyled.

#### The ruling I recommend

> **Sign D-14 as two signals: the 1 px `--ev-red` border and the 12 px `--ev-red` message with
> its filled circle-exclamation glyph. Strike the `--ev-red-lt` fill from §4.4 and §10.4.**

**I agree with the coordinator, and there is a structural reason stronger than the aesthetic
one they offered.**

Their argument is sound as far as it goes: the border already ships on eight primitives, so
ratifying it moves nothing; the fill has never shipped, so striking it builds nothing; a form
with four invalid fields paints four red plates; and `request.ts:59`, `safety.ts:59` and
`ComplianceView.tsx:22` each record a `--red-lt` **row** fill as a legacy defect R5a forbids.

Two things I add:

1. **The fill collides with the banner it is supposed to sit beneath.** §4.4's three layers put a
   page-level critical banner **and** the tinted fields on screen *simultaneously* — that is the
   whole point of the layered treatment. The banner's fill is `--ev-red-lt`. The fields' fill
   would be `--ev-red-lt`. **The summary and the items would be the same plate**, and the summary
   is the one carrying the count and the fix. A three-layer system whose layer 1 and layer 2 are
   indistinguishable by fill is not three layers. This is a correctness argument, not a taste
   one, and it is why I would strike the fill even if it had shipped.
2. **All four of R5a's sanctioned uses are a small solid object, a 3 px edge, or one banner.**
   None is a repeated large flat area inside a working surface. A per-field fill would be the
   first, and it would be the first *n* times per form. That is categorically a different spend,
   and it is exactly what the three legacy row-fill defects are.

**Two signals still satisfies the guarantee §4.4 exists for.** *Never colour alone* — border
plus message is two carriers and one of them is words. **WCAG 1.4.1 passes on the message
alone.** `--ev-red` on white is 6.574 : 1, so the border clears non-text 3 : 1 with room, and
the focus ring is a separate channel (`ring-2 ring-offset-2`), so an invalid focused field
composes both without collision.

#### The exact entry, for the owner to sign or decline

> **§6.2 D-14 — the inline field error.**
>
> **Clause A (ledger correction).** R5a's enumeration gains a fifth permitted use of red: the
> §4.4 inline field error's **1 px `--ev-red` border** and its **12 px `--ev-red` message with a
> filled circle-exclamation glyph**. Scope: a validation error attached to one field. Not a
> badge, not a row state, not a row fill, not a banner.
>
> **Clause B (design decision).** The `--ev-red-lt` **fill** is struck from §4.4 and
> `00-shell.md` §10.4. The inline field error is **two signals, not three**. `--ev-red-lt`
> remains what `globals.css` already says it is: the critical **banner** fill, and nothing else.

#### Where I challenge the framing

The coordinator filed D-14 as *"a ledger correction rather than a new deviation."* **That is
right for clause A and wrong for clause B, and the difference matters.**

Clause A genuinely is bookkeeping: the code ships it, R5a's own remedy for a fifth use is
precisely a §6.2 entry, and nothing in the build moves whichever way the owner leans.

Clause B **deletes a MUST**. Four documents currently promise a fill; after clause B, none does.
Presenting that as bookkeeping buys a cheap signature at a real cost: eighteen months from now
someone reads *"ledger correction"*, finds `input.tsx:22` still quoting the three-signal rule in
a comment, and re-adds the fill believing they are repairing a regression. **A struck MUST has
to be struck loudly or it grows back.** So: one entry, two clauses, labelled for what each is —
and if clause B is declined, the cost is stated with it: the fill gets built on eight primitives,
`--tone-critical`'s *"banners only"* annotation becomes wrong and must be rewritten, and §4.4's
layer 1 and layer 2 need a second red tint minted to stay distinguishable, which is a **sixth**
use of red and another §6.2 entry.

**Nothing in this document waits on the answer.** Every auth screen here specifies border plus
message, which is what the codebase already does.

#### The comments that must be corrected either way

Independent of the signature, `input.tsx:22` and `field.tsx:12` currently document a rule the
files do not implement. **A comment asserting an unimplemented MUST is how the next engineer
"fixes" a non-bug.** Both headers need rewriting to match whatever D-14 lands on —
frontend-engineer, one line each, and it is the cheapest defect prevention in this document.

---


### 16.2 Onboarding questions still open

| # | Question | Who answers | Default while it is open |
|---|---|---|---|
| **Q-O2** | The help centre (Q-82): who writes the 21 short *More about this* articles, and where they live. | content-designer, then the owner | `learnMoreKey` stays `null` and nothing renders. |
| **Q-O3** | Should auto-open wait for the landing route's first successful render (§10.4), or open on the shell's first paint? | product-designer | Wait for the first successful render, as designed. Opening a layer over a skeleton is noise. |
| **Q-O4** | D4: whether a Trust & Safety and a Dispatcher role exist. Each adds a track and a role illustration. | business owner | Four tracks. |
| **Q-O5** | Should the role illustration also appear in the account-menu header? | product-designer | No; the menu is a list. |

## 17. Handoff

**Artifact:** `docs/05-restructure/design/08-auth-and-onboarding.md`. Six auth screens, one
modal, one shell layer, one device list, 28 auth states, 12 onboarding states, 21 onboarding
steps, every string final.

### To **frontend-engineer**

1. **§8 is the expensive part, and here is the reduction.** The spec asked you to respond to the
   two-mount-point cost rather than comply. **One `<AuthCredentialForm>` with a `mode` prop,
   mounted twice** (§8.1) — one form, one validation path, one copy set, two containers. The
   guarantee is not dropped and nobody may drop it.
2. **`readOnly`, never `disabled`, on every text input in every frozen or in-flight state.**
   §2.5 and §8.1. This is the single most likely defect in the document, and **AC-562**,
   **AC-563** and **AC-586** all fail on it.
3. **One `<p id="session-expired-reason">`**, visually hidden, referenced by
   `aria-describedby` from every frozen control (§8.1). A `title` attribute is hover-only and
   fails **AC-563** outright.
4. **The code field is one input, centred, `dir="ltr"`** (§4.1). Do not build six boxes.
   `autocomplete="one-time-code"` and the paste-strip rule are what **AC-520/521/537** check.
5. **`aria-live="off"` on the resend countdown's ticking number**, one polite announcement when
   it re-enables (§4.4).
6. **New composition needed: `<AuthWordmark>`** — `EyvarMark` at 24 px + the word (§2.2).
7. **Two shell changes, and they are yours:** `ShellContext` gains the session lifecycle and the
   freeze contract (§8.1), and **entering `session-expired` closes every open shell layer
   first** (R4-3 §3.2). `route.overlay` gains `onboarding` and **not** `reauth`.
8. **No toast on any auth screen** (§2.1) and **no toast on onboarding auto-completion**
   (§10.2). Both will feel like omissions and both are decisions.
9. **No `shadcn add`.** `alert-dialog`, `sheet`, `accordion`, `collapsible`, `progress`,
   `radio-group`, `input-group`, `checkbox` and `skeleton` are all already in
   `src/components/ui/`.

### To **utilities-engineer**

1. **A plural-aware interpolation for eight keys** (§12) — `{minutes}`, `{seconds}`, `{count}`,
   including an explicit **`=0`** form on `auth.reset.done`. Arabic has six plural forms and
   none of these may be assembled by concatenation (**AC-670**, **AC-671**).
2. **A cooldown ticker** — 30 / 60 / 120 s per challenge, driven off a server-issued deadline
   rather than a local `setInterval` start, so a backgrounded tab does not resume with a stale
   number (§4.4).
3. **A `<Bdi>` or an equivalent helper** for the eight LTR-pinned runs in §12: the masked hint,
   emails, IPs, phone numbers, the TOTP secret, dates.
4. **Focus capture and restore across the freeze** (§8.1) — record the active element at freeze,
   restore it after re-auth. `useFocusEntry` is close but is scoped to layer open/close.
5. **Do not** build a client-side lockout counter. §3.2: the lockout minutes are re-read per
   attempt and never tick in the browser. The resend cooldown does, and §4.4 says why the two
   differ.

### To **mock-data-engineer**

1. Everything in spec §10 stands. Two additions from this document:
   **`session.devices` rows need `trustedUntil: IsoDateTime | null`** and
   **`isCurrent: boolean`**, for §9's `This device` badge and `Trusted until {date}` line.
2. **`onboardingTracks.ts` — 21 rows, titles and bodies in §10.5**, ids exactly as given, so
   **AC-618** (steps 1–3 byte-identical by id) and **AC-642** (shared ids survive a role change)
   are both diffable. `learnMoreKey: null` on all 21 (**F-2**). `requiredPermission: null` on
   all 21 until **Q4** (**F-5**).
3. **`ops.dispatch` and `support.ticket` must resolve to `available: false`** against today's
   route table, so §10.2's disabled-in-place path is reachable now (**AC-609**, **AC-626**).
4. The `?mockFail=auth.signIn:429` status syntax request (spec §10.4) is unchanged and still
   worth having — §3.2's rate-limit copy is otherwise testable only in a unit test.

### To **product-owner**

**Seven spec overrules, §15**, each written as it should read; two more I filed there were not overrules and are conceded in §15.1. Four of the seven change a criterion —
**AC-503**, **AC-567**, **AC-630** and §12.2's example string — and two add states to §9.1.
**AC-540** is a clarification, not a change.

### To **main**

Design spec written: `docs/05-restructure/design/08-auth-and-onboarding.md` — six auth screens,
the re-auth modal, the onboarding layer, the device list, every state drawn, every string final,
zero placeholders. **No new owner signature requested**; the three outstanding are untouched.

**Not blocked.** Named and not blocking: **F-1** (R5a's enumeration vs the already-shipped
inline field error — a §6.2 entry is drafted) · **F-4/Q-78** (AC-663 fails visibly, as already
recorded) · **F-5/Q4** (AC-610 cannot pass until the 34 sub-tab permissions land). **D4 does not
block** — four tracks ship against the four roles that exist, and adding two is a fixture edit.
