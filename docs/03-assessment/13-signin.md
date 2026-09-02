# 13 — Sign-in and authentication: assessment

> **Owner:** product-designer. **Assessment, not a design spec.** Read-only pass over the six
> auth screens as they run today.
>
> **The owner's question, verbatim:** *"what about the signin, does it give the user the felling
> of our brand and give him the best looking and easies experience or it needs more guidence"*
>
> **Answered in one line:** the flow is *easy* — genuinely, measurably, better than most B2B
> consoles — and it is *not* branded, *not* trustworthy-looking, and it has **six states where an
> operator is told something false or is given no way out**. The owner's instinct is right, but
> the missing thing is not "more guidance" in the sense of more words. Three of the six broken
> states are broken because **the app and the mock data are running on two different clocks**, and
> one of them is broken because a promise on the card is not implemented at all.
>
> **Everything below was reached in a running browser**, at `http://localhost:5323`, with
> Playwright driving the real app. Nothing here is recalled from the spec. Where I quote a
> string, it is the string the DOM held. Where I quote a number, I measured it.
>
> **Reference examined this pass, not recalled:**
> `docs/06-design-reference/shopify-admin-web/00-auth/login-password-step-empty.webp` ·
> `…/login-two-factor-authenticator-code.webp` · plus the live brand site `https://eyvar.com/en`
> (reachable; palette and typeface extracted from the served HTML/CSS).
>
> **Mobbin MCP was requested and is not available in this session** — no `search_screens` /
> `search_flows` tool is exposed. I used the 159 local Shopify captures, which are the sanctioned
> reference under `DECISIONS.md` anyway, and the live brand site. Where I would have wanted a
> third-party comparison I have said so rather than describing one from memory.

---

## 0. The verdict, on one screen

| Question the owner asked | Answer | Evidence |
|---|---|---|
| Does it feel like our brand? | **No.** One brand element renders: the green `Sign in` button. The mark is `#171a21` neutral-black, not the brand's `#03160F`; the type is Inter, not the brand's IBM Plex Sans Arabic; the ground is a flat neutral grey; the words are `Eyvar operations console`. Everything else on the card is shadcn defaults restyled to a token set that happens to be ours | §5 |
| Is it the best-looking it could be? | **No, and the reason is structural.** The card is 400 × 480 px in a 1440 × 900 viewport — **14.8 % of the frame by area** — and the other 85.2 % is one flat grey. This is the one screen in the product with room to breathe and it is the emptiest screen in the product | §6 |
| Is it the easiest? | **Nearly.** 4 deliberate actions cold-to-console. Paste into the OTP field works perfectly, including `123 456`. `Enter` submits everywhere. But **`Remember this device` does nothing** — ticked, the next sign-in still demands a code — so the one lever that would make daily sign-in a 3-action job is a lie on the card | §7, D-1 |
| Does it need more guidance? | **It needs more *true* guidance.** The copy is excellent and final. What is broken is that four states either report a false fact (`Wait 0 minutes`), report the wrong fact (a 429 reported as a network failure), report nothing at all (the resend cooldown never counts), or strand the operator with no exit (a 401) | §8 |
| Would you trust it with a payout run? | **Not on the 401 screen, no.** An unauthenticated `session.current` renders a half-built console showing another operator's name — `On call: Yousef Al-Balawi` — and a notification badge of `7`, with no `Sign in` control anywhere | §9, D-2 |

**Nine defects, ranked.** Four are one-line fixes. None of them is a design defect in the spec;
`design/08-auth-and-onboarding.md` is one of the best documents in this repo and the build follows
it closely. Every defect below is a seam, an omission, or a promise nobody wired up.

---

## 1. How this was run

```
npx vite --port 5323          # the app, mock data source
npx vitest run src/screens/auth src/components/auth --maxWorkers=4
  → 4 files, 110 tests, all green, 16.29 s
```

**One thing you must know to reproduce any of this.** In mock mode the app boots
**authenticated** — `useSessionLifecycle` initialises `status: 'authenticated'`
(`src/shell/session.ts:176`) and `/signin` render-redirects under AC-502
(`SignInScreen.tsx`, the `if (authenticated) return <Navigate …>` branch). So
**`http://localhost:5323/signin` never shows you the sign-in card.** You reach it only by opening
the app, opening the account menu in the top bar, and choosing `Sign out`. A reload puts you back
in the console. Every capture below did that first.

`/forgot-password`, `/reset-password`, `/activate` and `/signin/enroll` are **not** guarded, so
those four can be opened cold — which is also how I got the pseudo-locale width test to run.

Fixtures used: `sarah@eyvar.com` (Owner, TOTP), `yousef@eyvar.com` (Ops Manager, SMS),
`fahad@eyvar.com` (Finance, no second factor → enrolment), `noura.f@eyvar.com` (Invited),
`suspended@eyvar.com`, `locked@eyvar.com`. Password `eyvar-ops-2026`. Codes `123456` correct,
`000000` expired, `111111` superseded, `999999` straight to locked. Reset tokens
`valid` `expired` `used` `superseded` `invite`.

---

## 2. What the screen actually looks like — English, 1440 × 900

Measured, not estimated. `main` bounding box `x 520, y 209.75, w 400, h 480.5`.

```
1440 × 900 viewport, ground #f6f8f9 flat, edge to edge, no gradient, no image, no texture
────────────────────────────────────────────────────────────────────────────────────────
                                                                     
                          ┌──── 400 px, y=210 ────────────────┐      
      520 px of           │ 32                                │      520 px of
      empty grey          │  ▪ Eyvar     ← 24px black rounded │      empty grey
                          │              square, white "Y"    │
                          │              glyph; word "Eyvar"  │
                          │              15/600 #171a21       │
                          │                                24 │
                          │  Sign in            22/28 w600    │
                          │  Eyvar operations console          │  14/20 #6b7280 (4.83:1)
                          │                                16 │
                          │  Email                    14/400  │
                          │  ┌──────────────── 334 × 40 ────┐ │  1px #dde0e4, r8
                          │  └──────────────────────────────┘ │
                          │  Password                         │
                          │  ┌───────────────────────┬──────┐ │
                          │  │                       │  ◉   │ │  reveal 32 × 32
                          │  └───────────────────────┴──────┘ │
                          │  Forgot password?                 │  14px #1b51c4 underlined,
                          │                                   │  118 × 20 hit box
                          │  ☐ Remember this device            │  checkbox 14 × 14
                          │     Skips the code on this browser │  12/16 #6b7280, wraps to
                          │     for 30 days. It never skips    │  two lines, indented to
                          │     your password.                 │  the LABEL not the box
                          │  ┌───── 334 × 40, #0C6944 ───────┐ │
                          │  │          Sign in              │ │  white 14/500, 6.73:1
                          │  └──────────────────────────────┘ │
                          │ 32                                │
                          └───────────────────────────────────┘
                            ↑ 1px #f0f2f4 border — 1.12:1 against
                              the ground; effectively invisible.
                              The card is held by shadow-2 alone.
                     ⚠ no legal row. `legalLinks()` returns [] so
                       Privacy / Terms do not render. Verified: main a → 0 links.
```

**What that reads as, honestly.** A white rectangle on a grey rectangle. The only thing on the
screen with any colour is the button. The card has no top edge you can see — its border is
1.12:1 — so it reads as a soft drop shadow with a form in it. If you deleted the wordmark, nothing
on this screen would tell you which company it belongs to.

The wordmark itself: `EyvarMark` is a 24 px rounded square filled `currentColor`, which resolves
to `--ev-ink #171a21`, with a white chevron-plus-stem path. At 24 px the chevron reads as a **`Y`**,
not as an `E`, and not as anything on the brand site. Alongside the word `Eyvar` at 15/600, the
lockup reads *Y Eyvar*.

Contrast, measured on every text node in `main`:

| Element | Ratio | Verdict |
|---|---:|---|
| `Eyvar` wordmark, `Sign in` h1, `Email`, `Password`, `Remember this device` | 17.41 | pass |
| `Eyvar operations console` subtitle, `Skips the code…` helper | 4.83 | pass (both ≥ 4.5) |
| `Forgot password?` | 6.95 | pass |
| `Sign in` label on `#0C6944` | 6.73 | pass |

**Nothing on the sign-in card fails contrast.** That is worth saying plainly, because the
defects below are numerous and none of them is a contrast defect on this screen.

---

## 3. What it looks like in Arabic — `dir="rtl"`, `lang="ar"`, 1440 × 900

**First, the caveat that governs everything here.** `src/i18n/dictionaries.ts:925` is
`export const AR: Dictionary = {}` — the Arabic dictionary is empty on purpose, documented as
AC-74's fixture. So I cannot judge Arabic typography, because there is no Arabic. What I *can*
judge, and did, is the mirroring and what the untranslated English does under RTL. Both matter.

```
dir=rtl, lang=ar, 1440 × 900 — layout mirrors correctly, strings do not translate
────────────────────────────────────────────────────────────────────────────────
                          ┌──── 400 px ───────────────────────┐
                          │                        Eyvar  ▪   │ ← lockup at inline-start
                          │                                   │   (= right). Mark glyph
                          │                          Sign in  │   does NOT mirror. Correct.
                          │        Eyvar operations console    │
                          │                            Email  │
                          │  ┌──────────────────────────────┐ │
                          │  └──────────────────────────────┘ │
                          │                         Password  │
                          │  ┌──────┬───────────────────────┐ │
                          │  │  ◉   │                       │ │ ← reveal now at inline-end
                          │  └──────┴───────────────────────┘ │   (= left). Correct.
                          │                 ?Forgot password  │ ⚠ BIDI DEFECT
                          │        Remember this device  ☐    │
                          │    Skips the code on this browser │
                          │     for 30 days. It never skips   │
                          │            .never skips your      │ ⚠ BIDI DEFECT
                          │              password             │
                          │  ┌──── #0C6944, full width ─────┐ │
                          │  │          Sign in             │ │
                          │  └──────────────────────────────┘ │
                          └───────────────────────────────────┘
```

**The mirroring is right.** Every logical utility does its job: the lockup moves to the inline
start, the reveal button moves to the inline end, the labels right-align, the card does not widen.
The mark glyph does not flip. `AuthCard` earns its comment.

**The bidi is wrong, and it will still be wrong after Arabic ships.** Under an RTL paragraph
direction a Latin sentence's trailing neutral punctuation is reordered to the visual left:

- `Forgot password?` renders **`?Forgot password`**
- `…It never skips your password.` renders **`.never skips your password`**
- On the verify card, `Sent to ••••••62` renders **`••••••62 Sent to`**, and
  `6 digits. Codes expire 10 minutes after they're sent.` renders **`.digits. Codes expire 10 minutes after they're sent 6`**

Two of those go away when the strings are Arabic. **One does not:** any value that stays Latin
inside an Arabic sentence — an email address, `+966 5X XXX XXXX`, the masked hint — needs the
`<bdi dir="ltr">` treatment. `IsolatedValue` exists and does this correctly for the masked hint
(the `••••••62` run itself is intact and in the right order in my capture), so the machinery is
right; it is only unexercised because the surrounding sentence is English today.

**The finding that survives translation, and it is the important one:**

> **There is no way to switch to Arabic from any of the six auth screens.**

`setLanguage`'s only production entry point is `AccountMenu` (`src/shell/AccountMenu.tsx:79`),
which lives inside `AppLayout`. The six auth routes are **siblings** of `AppLayout` in
`routes.tsx:292-297` — that is AC-500 working exactly as designed. The consequence nobody
costed: an Arabic-first operator's first contact with Eyvar is an English form with no toggle.

It is worse than that, because the preference does not persist either. `useLanguageState` reads
`defaultUiStore(UI_STATE_KEYS.language)`, which is a `createCachedStore` keyed by
`uiStateCacheKey(owner, …)` and returns the in-memory fallback whenever the owner is `null`
(`src/lib/persistence.ts:249-251`). The owner is set by `setUiStateOwner`, and **nothing in
production calls it** — I grepped: every hit outside `lib/` is a comment or a test. So the
language choice is memory-only and dies on reload, for the whole product, not just for auth. I
had to write `eyvar.owner` and `eyvar.1.USR-1.ui.language` into `localStorage` by hand to get an
RTL render at all.

**At 1440 with pseudo-localisation (`?pseudo=1`, which lengthens every keyed string ~35 %) the
card holds:** no clipping in either direction, card height grows 389 → 421 px in `ar`, 481 → 521 px
on the reset card. The 400 px width tolerates Arabic's 4–8 % expansion with margin. That is a
real pass and I want it on the record alongside the failures.

---

## 4. What it looks like at 390 × 844 — and this one is a defect

```
390 px viewport
──────────────────────────────────────────
█████████ card, w=400, x=-5 ██████████████   ← 5px clipped off EACH side.
█  ▪ Eyvar                               █      scrollWidth is 390, so there
█  Sign in                               █      is no horizontal scroll: the
█  Eyvar operations console              █      radius and border are simply
█  Email  [                          ]   █      sliced off. It reads as a
█  Password [                     ◉ ]    █      full-bleed white band, not a
█  Forgot password?                      █      card.
█  ☐ Remember this device                █
█  [           Sign in            ]      █
██████████████████████████████████████████
```

`AuthCard` uses `w-100` — a fixed 400 px — per design §2.1 *"400 px, fixed, never fluid"*, with
`px-4` on the ground. Below a 432 px viewport the ground padding is consumed and the card clips.
390 px is the iPhone 12/13/14/15 logical width. Operators sign in from phones.

The **short-viewport** rule works correctly: at 1440 × 520 the card top-aligns at `y = 48`,
`scrollHeight 577 > 520`, and the page scrolls. §2.1 delivered as written.

---

## 5. Brand — what carries it and what is missing

### 5.1 What the brand actually is

Fetched from `https://eyvar.com/en` this session:

| | Brand site | Sign-in card | Match |
|---|---|---|---|
| Primary green | `#0C6944` | `#0C6944` on the primary button | ✅ the one thing that matches |
| Dark | `#03160F` — a **green**-black | `#171a21` (`--ev-ink`) — a **blue**-black | ❌ the mark is the wrong black |
| Neutral | `#F4F5F5` | `#f6f8f9` (`--ev-bg2`) | ≈ close enough |
| Accent | `#671412` deep maroon | — | not used, and probably shouldn't be |
| Typeface | **IBM Plex Sans Arabic**, one family for both scripts | Inter Variable + Noto Naskh Arabic Variable, two families | ❌ |
| Voice | *"Your stability partner… not just your journey"* · *"Planned mobility for your daily life"* · *"Everyone gives you a ride… Eyvar gives you a system"* | *"Eyvar operations console"* | ❌ |

### 5.2 The honest answer

**One of six brand carriers is present.** The green `Sign in` button. That is it.

The mark is the console rail's mark reused at 24 px, filled `currentColor` = `--ev-ink`. It is a
neutral-black rounded square with a white glyph that at that size reads as a `Y`. On a white card
on a grey ground it is a **black square**, and a black square is not a green brand.

Nothing on the card says what Eyvar is or what this console does beyond the four-word subtitle
`Eyvar operations console`. The brand's own voice — stability, system, planned — appears nowhere.
That is defensible on a console *interior*: an operator who signs in forty times a month does not
need a value proposition. It is not defensible on the *sign-in* screen, which is the one surface
where a new hire, an auditor, a partner, or a screenshot in a deck forms an impression.

### 5.3 What the reference does, that we deliberately chose not to

`00-auth/login-password-step-empty.webp`. Shopify's sign-in card is **neutral** — white card,
near-black button, small mark, `Help Privacy Terms` row. Every scrap of brand on that screen is
in the **ground**: a full-bleed dark atmospheric gradient, deep purple through teal, with soft
light behind the card.

Eyvar's `design/07-rulings-r4.md` §2.1, restated in `design/08` §2.1, ruled:
`--ev-bg2 #f6f8f9, flat, full-bleed. No gradient, no image, no second skin.`

That ruling took away the reference's only brand carrier and put nothing in its place. It is a
designer ruling — R4-2 §2.1 — not a `DESIGN.md` MUST, and §6 does not adopt it. **It is therefore
suspendable, and §11 suspends it.** I am naming it rather than quietly ignoring it.

---

## 6. Best-looking — layout, card, fields

### 6.1 What is genuinely good and should not be touched

- **`Forgot password?` sits under the password field, above the primary.** This overruled AC-503
  and it is correct — it is where the reference puts it and it is where the hand goes after a
  rejection. Confirmed in the running app.
- **One field height throughout, 40 px** (`--ev-control-h-lg`). Every field on every one of the
  six cards is 40. No mixed anatomy anywhere.
- **The banner slot is genuinely one slot.** I could not produce two banners on one card, and I
  tried — offline + rejected, transport + arrival. `resolveCondition` orders them and one renders.
  R10 holds by construction.
- **The whole-card replacements are right.** `/signin/verify` cold, and all four dead reset-token
  causes, replace the card rather than bannering an absent form, and each carries its exit as a
  button. AC-581 is honoured in every case I reached.
- **The 400 px width is right** and pseudo-localisation proves it.

### 6.2 What is wrong

**W-1 — 91.7 % of the screen is nothing.** 400 × 480 in 1440 × 900. At 1920 and 2560 it is worse.
The card is not too small; the *ground* is doing no work. This is the observation behind the
owner's question and it is correct.

**W-2 — the card has no visible edge.** `--ev-hairline #f0f2f4` on `--ev-bg2 #f6f8f9` is **1.12:1**.
The card is held by `shadow-2` alone. Inside the console this is right — cards sit on white and
the hairline separates structure. On the auth ground it means the card's silhouette is a blur.

**W-3 — two accent colours on a two-control card.** `Forgot password?` and `Use a different
account` are `#1b51c4` blue; the primary is `#0C6944` green. On a card with one input group and
one button, having the brand say "green" and the only link say "blue" splits the eye. R3 permits
blue for a link on white and the tokens are correct — but *permits* is not *requires*, and this
card is the one place where the cost of the split is visible.

**W-4 — the disabled primary is a faded green button.** `opacity: 0.5` on the whole element.
Composited: fill becomes `rgb(133,180,161)` (measured `rgb(132,179,160)` — matches), label becomes
`rgb(194,217,208)`. **Computed contrast 1.57:1.** Disabled controls are exempt from WCAG 1.4.3, so
this is not a formal failure — but on `/signin/verify` this is the control the operator stares at
while wondering why nothing happens, and its label is barely legible. It also carries
`disabled=true` with no `aria-disabled`, so it is out of the tab order entirely and a keyboard
operator never lands on it to hear why.

**W-5 — three interactive targets are under 24 × 24** (WCAG 2.5.8 AA):

| Control | Measured | |
|---|---|---|
| `Forgot password?` | 118 × **20** | fails |
| `Use a different account` (`/signin/verify`) | 133 × **16** | fails, worst |
| `Sign out` (`/signin/enroll`) | same treatment | fails |
| `Remember this device` checkbox | 14 × 14 | the `<label for>` is clickable, so the *effective* target passes; the *visible* control is 14 px and design §2.2 specifies 16 |

`Use a different account` at 16 px tall is the escape hatch on the screen where an operator has
just realised they typed the wrong account. It should not be the smallest thing on the card.

**W-6 — the strength meter stutters.** On `/reset-password` and `/activate`, two consecutive grey
lines:

```
At least 12 characters                                       ← meter caption
At least 12 characters. Longer is better than more           ← policy line
complicated.
```

Four lines of grey saying one thing twice. Worse, the 4 px `bg-muted` track sits flush under the
focused field and reads as part of the input, not as a meter.

**W-7 — no step affordance on `/signin/verify` or `/signin/enroll`.** Nothing says "step 2 of 2".
The operator on the enrolment card does not know whether they are two clicks or ten from working.

---

## 7. Easiest — the measured step count, and what works

### 7.1 Cold to working console

Driven in the browser and counted.

| Persona | Screens | Deliberate actions | Notes |
|---|---:|---:|---|
| `sarah@eyvar.com` — enrolled, TOTP | 2 (`/signin` → `/signin/verify`) | **4** | click Email · Tab · Enter · Enter. Landed `/management/overview` |
| `yousef@eyvar.com` — enrolled, SMS | 2 | **4** + waiting for an SMS | identical, plus the network's latency |
| `fahad@eyvar.com` — no second factor | 4 (`/signin` → `/signin/enroll` A → B → landing) | **7** | pick method · type phone · `Send code` · type code · `Verify` |
| Invited operator via `/activate?token=…` | 4+ | **8+** | set password → then enrolment, which nothing warned them about |

**4 actions is very good.** For comparison, the reference splits email and password into two
submits, which is 5. Nothing on the happy path asks for anything it could infer, and nothing makes
the operator wait on a client-side timer.

### 7.2 The daily-irritation checklist — all of it passes except one thing

| Check | Result |
|---|---|
| `Enter` submits from the email field | ✅ |
| `Enter` submits from the password field | ✅ |
| `Enter` submits from the OTP field | ✅ |
| `Enter` on the reveal button does not toggle it | ✅ `type="button"` |
| Paste `123456` into OTP | ✅ fills, focus moves to `Verify`, **nothing submits** |
| Paste **`123 456`** (what an SMS client copies) | ✅ sanitised to `123456`, focus moves to `Verify` |
| Paste `123-456`, non-breaking space, Arabic-Indic digits | ✅ `sanitiseCode` folds through `toLatinDigits` then strips |
| Typing the 6th digit moves focus | ✅ it does **not** — correct, and deliberate |
| Auto-submit on 6 digits | ✅ there is none — correct on a screen where the 5th attempt costs 15 minutes |
| Non-digits rejected at input time | ✅ the keystroke never lands |
| OTP field is one input, not six boxes | ✅ |
| `autocomplete` tokens | ✅ `email` · `current-password` · `one-time-code` · `new-password` · `tel` |
| A real `<form>` with a `type=submit` | ✅ |
| Wrong code preserves nothing it shouldn't, focuses the field | ✅ field cleared and refocused, banner announced via `role="alert"` without stealing focus |
| Wrong password preserves the identifier, clears the password, focuses password | ✅ confirmed on all four rejection causes |

**A 2FA field that rejects a pasted code is a daily irritation — and this one does not.** It is
the best-implemented part of the whole flow and `OtpField.tsx`'s seven documented decisions are
all correct in the running app, including the RTL one: with `dir="rtl"` on `<html>`, `428916`
renders centred, in order, identical to LTR.

### 7.3 The password-manager story is weaker than it looks

Both fields carry the right `autocomplete` tokens and live in a real `<form>`, which is what
Chrome's own save-password heuristic keys on. But:

- **Neither input has a `name` attribute.** `name=""` on both.
- **Both `id`s are React-generated** — `_r_15_`, `_r_16_` — and will change between builds.
- `required` is `false` on both.
- The form has no `action`, and submission is an SPA route change rather than a navigation.

Chrome will probably still offer to save. Third-party managers that match on `name`/`id`, and any
operator who creates a custom field rule, will break on the next build. **This wants verifying
against a real Chrome profile with 1Password and Bitwarden installed before it ships** — I could
not test that from Playwright and I am not going to assert it either way.

### 7.4 The one thing that would make it easier, and does not work

**`Remember this device` does nothing.** See D-1. Ticking it, completing the code, signing out and
signing in again sends the operator to `/signin/verify` a second time. Verified in the browser and
then in the source: `signIn()` (`src/data/clients/auth.ts:319`) never reads the trusted-device
store; it goes straight to `openChallenge()` whenever `secondFactor !== null`. `rememberDevice` is
applied on `verifyCode` (`:487`) — it writes `trustOverrides[current.id]` so the device list shows
`Trusted until …` — but nothing ever reads it at the door.

The helper text under that checkbox is the most carefully-written sentence on the card:

> `Skips the code on this browser for 30 days. It never skips your password.`

It makes an explicit security trade the operator is being asked to accept. Right now they accept
it and get nothing.

---

## 8. Guidance — every failure state I reached, and what it told the operator

I reached fourteen. This is all of them, with the exact rendered strings.

### 8.1 The states that are right

| State | How reached | What it said | Verdict |
|---|---|---|---|
| Wrong password | `sarah@eyvar.com` + garbage | **critical** · `That email address and password don't match` / `Check both and try again.` | ✅ identifier kept, password cleared, focus to password, `role="alert"` |
| Unknown identifier | `nobody@eyvar.com` | **byte-identical to the above** | ✅ no enumeration |
| Suspended account | `suspended@eyvar.com` | **byte-identical** | ✅ |
| **Invited account** | `noura.f@eyvar.com` | **byte-identical** | ✅ AC-508 holds — the words *invited*, *activate*, *pending* appear nowhere. See §8.3 for why this is still a guidance problem |
| Malformed email | `fahad@eyvar` + Enter | inline, under the field: `Enter a valid email address.` — **no network request** | ✅ |
| Offline | context offline + `offline` event | **warning** · `You're offline` / `Sign-in needs a connection. Nothing you typed has been lost.` Primary `disabled=true`, `aria-describedby="auth-card-banner"` | ✅ the one state where disabling is right, and the reason is programmatically associated |
| Wrong code, attempt 1 | `654321` | **critical** · `That code is incorrect` / `Check the newest message and try again.` | ✅ |
| Wrong code, attempt 2 | `654322` | **critical** · same title / `…One more wrong attempt cancels this code.` | ✅ names the consequence at the moment it becomes true |
| Wrong code, attempt 3 | `654323` | **warning** amber · `This code was cancelled` / `Three wrong attempts, so the code no longer works. Send a new one.` Field goes `readOnly`, resend becomes `Send a new code` | ✅ tone change carries "this did not cost you an attempt" |
| Expired code | `000000` | **warning** · `That code has expired` / `Codes last 10 minutes. Send a new one.` | ✅ |
| Superseded code | `111111` | **info** · `That code has been replaced` / `A newer code was sent. Enter the one from the most recent message.` | ✅ |
| `/signin/verify` opened cold | direct navigation | **whole card replaced** · `That verification is no longer open` / `Sign in again to get a new code.` + `Go to sign in` primary | ✅ |
| Dead reset token — all four causes (`expired`, `used`, `superseded`, unknown) and **no token at all** | `?token=…` | **whole card replaced** · `This link is no longer valid` / `Reset links work once and expire after 60 minutes. Request a new one.` + `Request a new link` | ✅ one message for four causes, with an exit |
| Dead invite token | `/activate?token=nope` | `This invite is no longer valid` / `Invites expire after 7 days. Ask the person who invited you to send a new one.` + `Go to sign in` | ✅ names a person to ask, which is the right next action |

**That is a strong list.** No `please`, no exclamation marks, no blame, every message says what to
do next. The copy law is honoured throughout and I found no string I would rewrite.

### 8.2 The states that are wrong

---

#### **D-3 · `Wait 0 minutes, then sign in again.`**  — the frozen-account state tells the operator nothing

`locked@eyvar.com` + correct password:

```
┌──────────────────────────────────────────┐  #fef2f2
│ ⓘ  Too many attempts                     │  13/600 red
│    Wait 0 minutes, then sign in again.   │  ⚠ FALSE, and useless
└──────────────────────────────────────────┘
```

The fixture seeds `lockedUntil: offsetFromNow({ minutes: 12 })`. `offsetFromNow`
(`src/data/mock/clock.ts:98`) computes from **`EYVAR_NOW` = `2026-06-25T09:14+03:00`**.
`minutesUntil` (`src/components/auth/authContract.ts:264`) computes against **`Date.now()`**,
which is 2026-09-02. The deadline is 69 days in the past, so it clamps to `0`.

**Root cause, one line.** `useTick.ts:41` sets `let clockSource: Clock = systemClock`, and
`setClockSource(fixedClock)` is called **only from tests**. The whole UI reads the host clock while
the whole mock data layer reads a clock frozen in June.

**Why nobody caught it.** No test asserts a rendered lockout duration. I grepped: `AC-528` and
`AC-577` have zero test references, and the only test touching `auth.otp.resendIn` is a plural-rules
unit test that passes `{ seconds: 27 }` by hand. 110 auth tests are green and this ships.

**Design consequence, regardless of the fix.** Even with the clock corrected, `Wait 1 minute` is
a sentence and `Wait 0 minutes` is a bug that will recur at the boundary. The copy needs a floor:
`minutes < 1` should render `Wait a minute, then sign in again.` — a fifth string in the family,
not a clamp to zero.

---

#### **D-4 · A 429 is reported as a network failure**, with instructions that make it worse

`?mockFail=auth.signIn:429`, then sign in:

```
┌──────────────────────────────────────────┐
│ ⓘ  Couldn't reach the console            │
│    Nothing was sent. Try again.          │
│    [ Try again ]                         │
└──────────────────────────────────────────┘
```

**Byte-identical to `?mockFail=auth.signIn:500`.** I ran both.

Both statements are false for a 429. Something *was* sent — that is why the server is refusing.
And `Try again` is precisely the wrong instruction: retrying immediately is what extends a rate
limit. The banner even puts a `Try again` button inside itself, so the interface is actively
encouraging the one action that makes the state worse.

**Why.** `SignInScreen.tsx`'s `conditionForSignInFailure` *does* handle
`reason: 'rate-limited'` → `challenge-locked`, and the engineer left a careful comment saying so.
But `mockFailures` **throws** an `ApiError`, so a 429 never reaches that function — it lands in
the unqualified `catch` and becomes `{ kind: 'transport-error' }`. The seam swallows the status.
`src/data/types/common.ts:215` already computes `if (status === 401) return 'unauthorized'` and
classifies 429 too; **no UI code branches on that classification anywhere.**

---

#### **D-5 · The resend cooldown never counts**, so three designed affordances never render

`/signin/verify` for `yousef@eyvar.com`:

```
t = 0 s   [ Resend code ]   enabled, 334 × 40
t = 3 s   [ Resend code ]   enabled, unchanged
```

Design §4.4 requires `Resend code in 30s` → `60s` → `120s`, disabled while counting, with a
single polite `Resend code is available.` when it re-enables and a
`{count} resends left before you'll need to sign in again.` line under the button when 2 or fewer
remain. **None of that ever renders.** `resendAvailableAt` comes from the same June clock; every
cooldown has already elapsed.

Same root cause as D-3, different symptom, and it means the escalating-cooldown design is
completely invisible to anyone reviewing the running app.

---

#### **D-2 · A 401 does not return the operator to `/signin`** — and leaks another operator's name

`?mockFail=session.current:401`:

```
┌─ rail ─┬──────────────────────────────────────────────────────────────────────┐
│  ▪     │  [ Search  ⌘K ]        [ On call: Yousef Al-Balawi ]  [🔔 7]  [ ○ ]  │ ⚠
│        ├──────────────────────────────────────────────────────────────────────┤
│        │                                                                       │
│        │              Couldn't load your workspace                             │
│        │        Your identity and permissions didn't arrive. Try again.        │
│        │                        [ Try again ]                                  │ ⚠ 401s forever
│        │                                                                       │
│  Admin │              …and nothing else. No `Sign in` anywhere.                │
└────────┴──────────────────────────────────────────────────────────────────────┘
```

`ApiError` classifies 401 as `unauthorized` at `src/data/types/common.ts:215`. **Nothing branches
on it.** `AppLayout.tsx:539` renders `state.shellError` for every failure status alike, so the one
status that means *"you are not signed in"* produces a console frame with a retry loop and no
route to the sign-in card that exists two lines away in `routes.tsx`.

Two separate problems, and the second is worse than the first:

1. **No exit.** The operator's only control 401s again. There is no `Sign in`, no redirect.
2. **It renders operator-identifying content while unauthenticated.** `On call: Yousef Al-Balawi`
   and a notification badge of `7` are on screen for a caller whose session was refused.

Fair caveat: `?mockFail` targets one operation, so in a real 401 world the other endpoints would
also refuse and the chrome would be emptier. **The routing conclusion is unaffected** — a 401 on
`session.current` produces a shell error page, not `/signin` — and the leak is real for any
partial-401 case, which is the common one when a session expires mid-page.

---

#### **D-6 · The strength meter calls `Password123!` strong, then the server rejects it**

`/reset-password?token=valid`:

| Typed | Meter said | Then |
|---|---|---|
| `short` | `At least 12 characters` | — |
| `Password123!` | **`Password strength: strong`**, bar 100 %, green | submit → `This password has appeared in a known breach. Choose a different one.` |
| `correct horse battery staple` | `Password strength: strong` | ✅ |

`passwordStrength` (`authContract.ts:314`) is `length ≥ 16 → strong`, else
`classes ≥ 3 → strong`. `Password123!` is 12 characters with four classes, so it scores full marks
from the exact "more complicated" heuristic the policy line one row below explicitly disowns:

> `At least 12 characters. Longer is better than more complicated.`

The meter contradicts its own caption, awards the operator a green bar, and the server then
refuses the password. That is a whipsaw, and it is the kind of thing that makes an operator
distrust every other signal on the screen.

---

#### **D-7 · An invited operator arrives with three things missing**

`/activate?token=invite`. The card says:

```
Set your password
You've been invited to Eyvar as Support.
[ Password ]  [ Confirm new password ]  [ Set password ]
```

Missing, all three of which the invitee needs:

1. **Which account.** No email is shown. The reset card shows `For sarah@eyvar.com`; the activate
   card shows nothing — and the address they are activating is the one they will type at sign-in
   every day afterwards. The fixture resolves `noura.f@eyvar.com` from the token; it is simply
   not rendered.
2. **Who invited them.** The dead-invite state says `Ask the person who invited you` — so the
   product knows that person is relevant. The live state never names them.
3. **What happens next.** `noura.f@eyvar.com` has `secondFactor: null`. After `Set password` she
   goes to `/signin/enroll` — a whole second setup step nobody warned her about, on a card that
   opens with `Every sign-in needs a code. This can't be turned off.`

Separately: the byte-identical rejection for an invited account (AC-508, §8.1) is *correct
security* and *bad onboarding*. A new hire who has lost the invite email types their address into
`/signin`, is told `That email address and password don't match`, and has no path forward — the
account is not enumerable, so the console cannot tell them, and it also cannot tell them who to
ask. **This is the single strongest argument for a support line on the card** (§11, R-3): it is
the only surface where an un-activated operator can be given a next action without leaking that
the account exists.

---

#### **D-8 · Small ones, listed so they are not lost**

| | |
|---|---|
| After an in-app `Sign out`, `document.title` stays `Overview · Management · Eyvar Admin` | the tab, the bookmark and the password manager's entry are all labelled with the last page visited. A cold load of `/signin` gives `Eyvar Admin` (the `index.html` default); no auth route sets a title |
| The `readOnly` OTP field on attempt 3 still shows the green focus ring | a focus ring on a field that will not accept typing |
| The critical banner uses a **circle-info** glyph, the warning banner uses a triangle | a critical banner with an info icon reads as softer than it is |
| Enrolment step B routes to `/signin/verify`, not `/signin/enroll` | design §5 says *"Two steps, one card, one route."* Functionally fine; the title is correct (`Confirm your number`). Noted so a later reviewer does not read it as a bug or "fix" it into one |

**Retracted from an earlier pass:** I first recorded SMS enrolment as broken because
`+966512345678` was rejected. That was my harness — Playwright's `fill()` raced the field's
`autoFocus`. **Typed** character by character it works: `Send code` → `Confirm your number` /
`Sent to +966512345678`. `isPlausiblePhone` is fine.

---

## 9. Trust — would you sign a payout run into this?

Trust on a sign-in screen is built from four things. Eyvar has one and a half.

| | |
|---|---|
| **Provenance — who owns this?** | ⚠️ half. A black square and the word `Eyvar`. **No legal row.** `legalLinks()` returns `[]`, so `Privacy` and `Terms` do not render — verified, `main a` returns zero links. The decision (§1.3: *"a dead `Help` is worse than no `Help`"*) is right in principle and its consequence is that the sign-in page of a console that moves money has **zero** links, zero policy, zero attribution |
| **Competence — does it behave like software that is looked after?** | ❌ `Wait 0 minutes` is the single most trust-destroying string in the flow. An operator who has been locked out and is told to wait zero minutes concludes, correctly, that nobody checked |
| **Discretion — does it say too much?** | ✅ on `/signin`: four causes, one message, no enumeration, no redirect target echoed back. ❌ on the 401 shell, which prints `On call: Yousef Al-Balawi` to an unauthenticated caller |
| **Seriousness — does it look like a financial system?** | ❌ It looks like a well-built shadcn form. Nothing about the composition says *this console releases escrow*. The reference gets this from a dark, deliberate ground; we get it from nothing |

**The single worst trust moment in the flow is the 401 screen**, and it is worse than the missing
brand, because a broken console frame with another person's name on it and a retry button that
never works is what an operator will remember.

---

## 10. Defect register

| # | Defect | Severity | Owner | Fix size |
|---|---|---|---|---|
| **D-1** | `Remember this device` is not honoured — `signIn` never consults the trusted-device store | **High** — a written promise the product does not keep, and the biggest available ease win | mock-data-engineer + frontend-engineer | small: one branch in `signIn`, one in the real API contract |
| **D-2** | A 401 renders the shell error with no route to `/signin`, and leaks operator identity | **High** — trust | frontend-engineer (shell) | small: branch on `unauthorized`, which `common.ts:215` already computes |
| **D-3** | `Wait 0 minutes` — the app clock and the mock clock disagree by 69 days | **High** — the flagship guidance state is false | utilities-engineer | **one line**: `setClockSource(fixedClock)` in `main.tsx` when `DATA_SOURCE === 'mock'` |
| **D-4** | A 429 renders as `Couldn't reach the console / Nothing was sent. Try again.` | **High** — false, and the instruction makes it worse | frontend-engineer + mock-data-engineer | medium: the seam must carry the status past the `catch` |
| **D-5** | The resend cooldown never counts; three designed affordances never render | **Medium** | same as D-3 | same one line |
| **D-6** | The strength meter calls `Password123!` strong, then the server rejects it | **Medium** | utilities-engineer | small: `classes ≥ 3` should not reach `strong` below 16 chars; cap at `weak` |
| **D-7** | The invite card names no account, no inviter and no next step | **Medium** — onboarding | product-designer (me) + product-owner for the inviter field | medium: two strings, one already-available fixture field |
| **D-8** | Card clips 5 px per side below a 432 px viewport | **Medium** | frontend-engineer | small: `w-100` → `w-full max-w-100` |
| **D-9** | Three targets under 24 × 24; no language switch on any auth screen; stale `document.title` | **Low–Medium** | frontend-engineer | small each |

**None of these is a defect in `design/08-auth-and-onboarding.md`.** That document specifies every
one of these behaviours correctly. D-1, D-2 and D-4 are unwired; D-3 and D-5 are one shared seam
bug; D-6 through D-9 are omissions.

---

## 11. The proposal

Three parts. Part A is the redesign of the sign-in screen and is the answer to the owner's
question. Part B is the guidance work. Part C is the list of things to fix that need no design.

### 11.A — The sign-in screen, redesigned

#### A-1. The deviation, named first

> **I suspend `design/07-rulings-r4.md` §2.1's ground clause** — *"`--ev-bg2 #f6f8f9`, flat,
> full-bleed. No gradient, no image, no second skin."* — **for the six auth routes only.**
>
> **Grounds.** It is a designer ruling (R4-2), not a `DESIGN.md` MUST, and §6 does not adopt it,
> so nothing in the precedence ladder binds it. It was written to stop the *console* growing
> decorative surfaces, which is right and stays right. Applied to the auth card it removed the
> reference's only brand carrier — `login-password-step-empty.webp` is a neutral card on a deep
> atmospheric gradient — and substituted nothing. The result is measurably 85.2 % empty grey.
>
> **Scope of the suspension: the ground only.** No gradient inside the card, no illustration, no
> imagery, no second skin on any console surface. R8 is untouched: this is not an empty-state
> illustration. R5a is untouched: no new red. R1/R16 are untouched: the card stays a card.

#### A-2. The redesign

```
1440 × 900
════════════════════════════════════════════════════════════════════════════════════════
                                                    ┃
   BRAND PANEL — 50 % width, `--ev-brand-dk`        ┃  CARD COLUMN — 50 %, `--ev-bg2`
   (#03160F, from the brand site; NEW TOKEN,        ┃   flat, unchanged
   see A-4)                                         ┃
                                                    ┃      ┌─── 400 px ──────────────┐
                                                    ┃      │ 32                      │
   ▪ Eyvar   ← mark 32px, `--ev-brand` #0C6944      ┃      │  ▪ Eyvar   mark now     │
              fill, white glyph; word in            ┃      │            `--ev-brand` │
              white 17/600                          ┃      │                      24 │
                                                    ┃      │  Sign in       22/28    │
                                                    ┃      │  Eyvar operations       │
   Planned mobility,                                ┃      │  console                │
   run from one console.                            ┃      │                      16 │
   ← 28/36 white, w600, max 2 lines, max 22em.      ┃      │  [ BANNER SLOT ]        │
     Brand voice, not marketing: it is what the     ┃      │  Email     [        ]   │
     console IS. Sourced from the brand site's      ┃      │  Password  [     ◉  ]   │
     "Planned mobility for your daily life" and     ┃      │  Forgot password?       │
     "Eyvar gives you a system".                    ┃      │  ☐ Remember this device │
                                                    ┃      │     Skips the code on   │
                                                    ┃      │     this browser for 30 │
                                                    ┃      │     days. It never      │
                                                    ┃      │     skips your password.│
   ─────────────────────────────                    ┃      │  ┌────── Sign in ─────┐ │
   Privacy   Terms   Contact                        ┃      │  └────────────────────┘ │
   ← 12px, white at 80 %, underlined.               ┃      │ 32                      │
     THE LEGAL ROW MOVES HERE, off the card.        ┃      └─────────────────────────┘
     See A-3.                                       ┃
                                                    ┃
════════════════════════════════════════════════════════════════════════════════════════
```

**Below 1024 px the brand panel collapses**: it becomes a 96 px band across the top of the ground,
holding the mark, the wordmark and the legal row on one line; the sentence drops. Below 432 px the
card goes `w-full max-w-100` and the ground keeps its `px-4` (this fixes D-8 at the same time).

**Why a split rather than a full-bleed gradient.** Three reasons, and none is taste:

1. **It is a flat fill, so it is one token and it is testable.** A gradient is a value that cannot
   be expressed as a semantic slot, cannot be contrast-checked as a pair, and is the first thing
   that drifts. A flat `--ev-brand-dk` panel is `bg-brand-dk` and nothing else.
2. **It gives the copy somewhere to live.** The owner's real question is *"what fills the space."*
   Colour alone does not fill space; it tints it. One brand sentence and a legal row do.
3. **It mirrors for free.** The panel is `inline-start`; in Arabic it moves to the right and the
   card to the left, with no second rule. A gradient with a light source does not mirror cleanly.

**What does not change.** The card. Its width, padding, radius, shadow, field order, field
heights, the position of `Forgot password?`, the primary, every string. All six cards keep the one
anatomy. This proposal adds a ground; it does not touch `AuthCard`'s interior.

#### A-3. Two changes inside the card

**The legal row moves to the brand panel, and it gets a third link.**

§1.3's rule — *render only the links the pane provides; a dead `Help` is worse than no `Help`* —
is right and stays. But the consequence today is a money console whose sign-in page has zero
links. The fix is not to relax the rule; it is to **make the links exist**:

| Link | Status |
|---|---|
| `Privacy` | needs a page. **Product-owner decision, not mine.** |
| `Terms` | needs a page. Same. |
| `Contact` → `mailto:` an operations address | **needs only an address**, and it is the single highest-value string on this screen — see D-7. It is the only way to give an invited operator, a suspended operator or a locked-out operator a next action without leaking whether the account exists |

If the pane provides none, the row still does not render — the rule holds. I am asking
product-owner for the three values, not for an exception.

**The mark takes brand green.** `EyvarMark` fills `currentColor`; today its parent is
`text-foreground` = `--ev-ink`. In `AuthWordmark` only, the parent becomes `text-brand`. On the
dark panel the mark is `--ev-brand` on `--ev-brand-dk`; on the card it is `--ev-brand` on white.
The console rail is unaffected — one word changes in one component that has exactly one other
consumer.

**`Forgot password?` and `Use a different account` stay blue.** I considered making them
`--ev-brand` to kill W-3 and decided against it: R3 assigns links on white to `--ev-blue-dk`, that
is a product-wide rule, and buying visual unity on one card by making links a different colour
here than everywhere else is a bad trade. W-3 is instead solved by the panel — once there is a
large green field on the screen, one blue link stops reading as a competing accent.

#### A-4. Tokens

| Token | Value | Status |
|---|---|---|
| `--ev-brand` | `#0c6944` | **exists**, `globals.css:643` |
| `--ev-brand-lt` | `#e7f0ec` | **exists**, `:666` |
| `--ev-brand-dk` | **`#03160F`** | **DOES NOT EXIST — must be added.** Sourced from the live brand site, not invented |
| Panel text | white on `#03160F` | **18.66 : 1** — passes AAA at every size |
| Legal links on the panel | white at 80 % on `#03160F` | **12.01 : 1** — passes |
| Mark `--ev-brand` on `--ev-brand-dk` | `#0c6944` on `#03160F` | **2.77 : 1** — fails ⚠️ **the mark must be white on the dark panel, and `--ev-brand` on the card only.** Named here so it is not discovered late |

`globals.css` has a single owner under `PHASE-PLAN.md`. **I am requesting `--ev-brand-dk`, not
adding it.**

#### A-5. Typography — the one brand change I am *not* proposing yet

The brand site is set in **IBM Plex Sans Arabic**, one family covering both scripts. The console
is Inter Variable + Noto Naskh Arabic Variable, two families.

Switching the *console* is out of scope and probably wrong — Inter's tabular figures and its
behaviour at 13 px in a 30 px row are load-bearing for the whole product. Switching the *auth
screens only* would give the first screen the brand's voice at the cost of a second type system.

**I am recording this as a decision for product-owner, not taking it.** It is the largest
remaining brand gap after the ground, and it is the one I am least confident about. My inclination
is: set the **brand panel's sentence and wordmark** in IBM Plex Sans Arabic and leave the card in
Inter. That is one webfont, on one element, on one screen, and it is exactly where the brand voice
lives — but it introduces a second family and someone senior should say yes.

### 11.B — Guidance, as strings and states

Nine changes. Every string below is final; none is a placeholder.

| # | Where | Change |
|---|---|---|
| **G-1** | lockout family | Add a floor form. `auth.lockout.retryIn#0`: **`Wait a minute, then sign in again.`** `Wait 0 minutes` must be unreachable by copy, not only by clock |
| **G-2** | rate limited | Stop rendering a 429 as a transport error. New condition `rate-limited`, **critical**, title **`Too many sign-in attempts`**, body **`Wait {minutes}, then try again. Attempts from this browser are paused.`** The banner's `Try again` button is **not rendered** in this state — it is the one state where retrying is the wrong action |
| **G-3** | 401 | Redirect to `/signin` with an arrival banner, **info**, title **`You've been signed out`**, body **`Sign in to continue.`** Never the shell error page. Distinct from the two existing session-ended reasons, because this one has no duration to quote |
| **G-4** | `/activate` | Add `For {email}` under the subtitle, same treatment as the reset card, via `IsolatedValue` so the address stays LTR in Arabic. Key `auth.activate.forAccount` |
| **G-5** | `/activate` | Add the next step. New line under the policy: **`You'll set up a verification code after this.`** Key `auth.activate.thenEnrol`. Rendered only when the invited account has no second factor — which the activate token's fixture already knows |
| **G-6** | `/signin/enroll` | Add a position line under the h1: **`One-time setup. You'll be signed in straight after.`** Key `auth.enroll.oneTime`. It costs one sentence and answers the only question an operator has on that card |
| **G-7** | strength meter | Suppress the `short` caption when the policy line is directly beneath it. Two grey lines saying `At least 12 characters` twice is worse than one |
| **G-8** | strength meter | Cap at `weak` below 16 characters regardless of character classes, so `Password123!` reads **`Password strength: weak`** — which is true, and which agrees with the policy line instead of contradicting it |
| **G-9** | `/signin` legal row | See A-3. Three links or none, and `Contact` is the one that matters |

**What I did *not* add, and why.** No "need help?" prose, no reassurance, no security badges, no
"your data is safe" line. The copy law bans warmth and it is right to. Every string above names an
action or a fact. The screen does not need more words; it needs the four false ones replaced and
five true ones added.

### 11.C — Fixes needing no design decision

1. `setClockSource(fixedClock)` in `main.tsx` when `DATA_SOURCE === 'mock'`. **Fixes D-3 and D-5.**
   One line.
2. `signIn` consults the trusted-device store before opening a challenge. **Fixes D-1.**
3. Branch on `ApiError`'s existing `unauthorized` classification in `AppLayout`. **Fixes D-2.**
4. Carry the HTTP status past the `catch` in `SignInScreen.submit` so `conditionForSignInFailure`
   can see a 429. **Fixes D-4.** The function is already written and already handles it.
5. `w-100` → `w-full max-w-100` on `AuthCard`. **Fixes D-8.**
6. `min-h-6 min-w-6` (or an inset pseudo-element) on `Forgot password?`, `Use a different account`
   and `Sign out`. Checkbox 14 → 16 px, which design §2.2 already specifies.
7. A `document.title` per auth route.
8. Add `name="email"` / `name="password"` alongside the existing `autocomplete` tokens, then
   **verify autofill against a real Chrome profile with 1Password and Bitwarden** before ship.
9. Drop the focus ring on the `readOnly` OTP field.
10. Give the critical banner a warning-triangle or octagon glyph rather than circle-info.

### 11.D — Tests that must exist, or these regress

The reason a two-month clock drift shipped is that **no test asserts a rendered duration**. Three
are needed and none exists today:

- `/signin` `challenge-locked` renders a **non-zero** minute count (AC-528, AC-577 — currently
  zero test references in the repo).
- `/signin/verify` renders `Resend code in {n}s` with `n > 0` on mount, and the label changes
  within 2 s (AC-532).
- `?mockFail=auth.signIn:429` renders the rate-limit banner and **not** the transport banner.

---

## 12. What I could not resolve

| | Needs |
|---|---|
| `Privacy`, `Terms`, `Contact` — do the pages/addresses exist? | **product-owner.** A-3 and G-9 are blocked on three values. This is the highest-value unblock in the document |
| Does the invite fixture know **who** invited an operator? | **product-owner** + mock-data-engineer. D-7's third gap. If the field does not exist it is a scope question, not mine to decide |
| IBM Plex Sans Arabic on the auth screens | **product-owner.** A-5. Largest remaining brand gap; I have deliberately not taken it |
| `--ev-brand-dk: #03160F` | **the `globals.css` owner.** Requested, not added |
| `AR = {}` — when does Arabic land, and does a language toggle belong on the auth card? | **product-owner.** The toggle is a scope question. AC-500 forbids chrome, but a 12 px `العربية` link in the legal row is not chrome, and without it an Arabic-first operator's first screen is English forever |
| Password-manager behaviour with real extensions | **qa-engineer**, on a real Chrome profile. I can assert the markup; I cannot assert 1Password |
| Enrolment step B routing to `/signin/verify` rather than staying on `/signin/enroll` | **frontend-engineer** to confirm intent. Design §5 says one route; the behaviour is correct either way and I am not calling it a defect |

---

## 13. Screenshot index

Captured this pass at `deviceScaleFactor: 2`, in
`…/scratchpad/shots/`. Regenerate with the scripts in the same directory.

| File | What |
|---|---|
| `A1-signin-en-1440` | the baseline, English |
| `B1-signin-ar-1440` | `dir=rtl` — mirroring correct, strings English, `?Forgot password` bidi defect visible |
| `D1-bad-password` `D3-suspended` `D4-invited` | the three byte-identical rejections |
| `D5-locked` | **`Wait 0 minutes, then sign in again.`** |
| `D7-429` `D8-500` | identical banners for a rate limit and a server error |
| `D9-offline` | the one correct disabled primary |
| `E2-verify-sms` `E2b-after-paste` | the OTP card; paste of `123 456` resolved to `123456` |
| `E3/E4/E5-wrong-1/2/3` | the attempt ladder, critical → critical → warning |
| `E10-verify-cold` | `challenge-missing` whole-card replacement |
| `G-reset-{valid,expired,used,superseded,garbage,notoken}` | one message, four causes, plus no-token |
| `H-activate-invite` | the invite card, showing the strength-meter stutter and the missing email |
| `I1-enroll-step-a` `R4-enroll-totp` | enrolment, both methods |
| `Q4-reset-ar-pseudo` | Arabic + pseudo-locale at +35 % — **no clipping** |
| `Q8-verify-ar-filled` | `428916` centred and in order under `dir=rtl` — D-OTP-7 validated |
| `Q9-signin-390` | the card clipping 5 px per side |
| `S4-session-401` | the shell error with `On call: Yousef Al-Balawi` and no way out |
