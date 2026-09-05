# 04 — Authentication and role-based employee onboarding

**Wave:** cross-cutting. Auth sits **outside** `AppLayout`; onboarding sits **inside** it as a
fourth shell layer.
**Acceptance criteria:** **AC-500 – AC-681**, contiguous. (1–79 foundation · 80–116 wave 1 ·
200–344 wave 2 · 300–450 wave 3 are taken.)
**Artifact status:** build-ready for auth. Onboarding is build-ready for four roles and
**provisional on D4** for the two proposed ones — §8.6 names exactly which criteria move under
each D4 outcome.

> **Reconciled with `design/08-auth-and-onboarding.md`.** That document's §15 records
> nine overrules of this spec; all nine are applied. **§19** is the record: what was applied as
> written, what was applied with a different shape and why, which two were not overrules at all,
> and **five further contradictions between the two documents that §15 did not name** (§19.3).
> **Where the two disagree on a string, a placement or a control inventory, the design spec is the
> source** and the criterion says so in its own text.
>
> **Two criteria are KNOWN-FAILING and must not be reported as regressions:** **AC-663** (blocked
> on **Q-78** — no `manage_security_policy` key exists) and **AC-610** (blocked on foundation
> **Q4** — every `requiredPermission` is `null`). Each names its blocker in place. **One cross-wave
> blocker** is recorded at **§16.1 B-1**.

**Evidence convention.** Every claim about current behaviour carries a `file:line`. Every claim
that could not be grounded in the legacy app or an existing doc carries **`[inferred]`**. On these
two surfaces the `[inferred]` tags are dense and that is the honest signal: **there is no login
screen in `eyvar_ops_panel_v40_fixed.html`.** All 21,857 lines contain a change-password form, a
2FA boolean, and a seeded list of device sessions. Nothing else about authentication exists to
reverse-engineer.

---

## 1. Problem

A new Eyvar operator cannot get into the console at all, and once someone lets them in, nothing
tells them what their job is. There is no sign-in screen, no password reset, no verification step,
and no session — `CURRENT_USER_ID` is a module-level string pinned to `USR-1`
(`eyvar_ops_panel_v40_fixed.html:2862`), so the product has exactly one operator and that operator
is always the founder. The pieces that *look* like authentication are decoration: a change-password
form that validates length in the browser, stores nothing, and writes an audit row asserting a
credential change that did not occur (`:3036`–`:3045`); a per-user `twoFA` flag rendered as
`Enabled`/`Disabled` (`:3022`) and a workspace policy `require2FA` (`:2572`) that together gate
nothing, because there is no sign-in for them to gate; and a `sessionTimeoutMin: 30` setting
(`:2572`) with no session to time out. The team roster can invite a person — `commitInvite` pushes
a record with `status:'Invited'` and `lastLogin:'Not yet'` (`:10538`) — and **no line anywhere in
the file ever moves a team user from `Invited` to `Active`.** `USR-4` has been invited since the
fixture was written and can never arrive. Meanwhile the operators who *are* in the console are
handed a product with five workspaces, 34 sub-tabs and 131 permission guards, and are expected to
infer from the navigation which of it is theirs. A Finance lead and an Ops Manager see the same
console and have almost no overlapping work in it; today the console says nothing about that
difference on day one, day two, or ever.

---

## 2. Scope

### 2.1 In

1. **Sign in** — identifier plus password, then a second factor for every operator, every time,
   on an untrusted device (§4).
2. **Second-factor enrolment**, forced on first sign-in and on any account whose factor is not yet
   set (§4.4).
3. **Verification code (OTP)** — length, lifetime, resend cooldown, paste, wrong-attempt handling
   at the 3rd and 5th attempt, and the supersession rule (§5).
4. **Forgot password** — request, the non-committal confirmation, the reset link's lifetime and
   single-use guarantee, and the reset form (§6).
5. **Set password from an invite** — the missing `Invited → Active` transition (§6.6).
6. **Session** — absolute lifetime, idle timeout, the idle warning, `Remember this device`,
   re-authentication, and **the guarantee that an expiring session never destroys unsaved work**
   (§7).
7. **Sign out**, single-session and all-sessions, and the device list that already exists as a
   read-only display (`:2994`–`:3033`).
8. **Failure and edge states** — locked, disabled, invited-not-activated, network failure,
   role revoked mid-session, superseded code (§9).
9. **Role-based onboarding** — a per-role checklist in a shell layer, with an intro, steps grounded
   in real sub-tabs and real tasks, and a defined dismiss / skip / resume / restart lifecycle (§8).
10. **What the mock layer must provide** so that every state above is reachable without a backend
    (§10).
11. **The security posture** — which guarantees belong to the server and which to the client (§11).

### 2.2 Out — each with its reason

| Out | Reason |
|---|---|
| **Single sign-on / SAML / OIDC, and social providers** | `DESIGN.md` §2.5 D describes three social-provider tiles because the inherited baseline has them. Eyvar has one identity source: the team roster in `DB.teamUsers` (`:2830`). Shipping provider buttons that authenticate against nothing is chrome, and under D14 the *structure* we inherit is the flow, not the providers a consumer product happens to offer. Revisit when an identity provider exists. |
| **Self-service sign-up** | There is no such thing as a self-registering ops operator. Every account is created by someone holding `manage_team` (`:10530`). The inherited capture is out of scope entirely. |
| **The password hashing scheme, token format, and rate-limit implementation** | Server-side and not mine to choose. §11 states the *guarantee* each must meet; the mechanism is the engineering lead's. |
| **Impersonation ("act as team member")** | Already exists (`:3086`–`:3113`) and already has four recorded defects (`00c` F3–F7, including a total RBAC bypass at `:3098`). It is a **separate spec** and folding it in here would let its defects ride in on an auth review. Named as a cross-wave blocker in **§16.1 B-1**. |
| **Editing another operator's password, role or permissions** | Admin › Team & Access, wave 7. This spec covers only what an operator does to their *own* credentials. |
| **Biometric / WebAuthn / passkeys** | A strictly better second factor than SMS, and out of scope only because it needs a device-registration surface that does not exist. Recorded in §16 as **Q-77** so it is a deferral, not an oversight. |
| **Audit-log surfaces for auth events** | The events are specified here (§12.3) because they must be emitted; *rendering* them is Admin › Activity Log, wave 7. |
| **Onboarding content in Arabic** | Every string gets a key here (§12). The Arabic *copy* is a content decision, exactly as `src/i18n/dictionaries.ts` records for the shell's 200 strings. Keys yes, translations no. |
| **Product-tour libraries, coach marks, spotlight overlays** | `DESIGN.md` §5.6: *"MUST NOT use modal wizards, coach-mark tours, or blocking overlays for onboarding."* That rule is structural, not visual, so D7 does not touch it. §8.2 takes the position this forces. |
| **An onboarding editor** | Steps are fixture data (§8.9). Nobody edits them in the product until somebody asks. |

---

## 3. D14 — the reference split, proposed

**Status: PROPOSED. The business owner confirms or reverses it.** Everything in this spec is
written against it and nothing in it is expensive to reverse — the reversal is a design-spec edit,
not a re-spec.

### 3.1 The two instructions that appear to collide

> *"even the authentication of login and forget password, and otp — create them the same as a
> familiar console's."* — business owner, this request.

> **D7** — *"the **visual** language is the token layer … colour, spacing, radii, borders, type
> scale, page organisation, nav treatment, card treatment, table style and the spacing inside it."*

### 3.2 The boundary

> **The auth spec governs auth STRUCTURE and FLOW. D7's token layer governs the VISUAL
> LANGUAGE. Neither is overridden.**
>
> **Structure and flow:** which screens exist and in what order, what the card contains and in
> what sequence, what a failed code does, how the reset hand-off is worded, where the
> confirmation banner sits, what the strength meter is attached to. §4 onward states all of it.
>
> **Colour, spacing, radii, type, elevation, control shape:** `--ev-*` in
> `src/styles/globals.css`, which is where D7 landed.

### 3.3 Why this is a boundary and not a compromise

1. **D7 already scoped itself to the visual.** Its own text names what it replaces (*"the
   **visual** content of §1–§5, plus §6.1's token values"*) and what it does not (*"**§7
   accessibility**, **§8** the Eyvar-only patterns, and **§9** bidirectionality … the structural
   law survives intact, because it was never tied to any one reference"*). Auth *flow* is
   structural law of exactly that kind. D14 does not carve an exception out of D7; it records a
   boundary D7 drew and had no occasion to name.
2. **No visual reference covers an auth screen.** D7's evidence is in-product screens; a
   sign-in page appears in none of it. So "make auth look like the rest of the product" can only
   mean "derive it from `--ev-*`", which is what D14 says. Importing a login page's skin — a
   purple-to-teal gradient and a `#3E3E3E` primary — into a product whose accent is `#2B6EF0`
   and whose primary is `--ev-ink` would mean shipping two skins.
3. **A product with two skins is worse than a login page a shade off anyone's reference.** The
   sign-in screen is seen once a shift; the console is seen all day. The console is the one that
   must match.

### 3.4 What D14 costs, stated plainly

`DESIGN.md` §2.5 **D** is an inherited observation and mixes both halves in one paragraph. Under
D14 it splits:

| §2.5 D clause | Under D14 |
|---|---|
| "Card contents, in fixed order: wordmark → h1 → one-line subtitle → field(s) → full-width primary → …" | **Kept.** Structure. |
| "field order: identity → primary action → alternates → sign-up/sign-in switch → legal links" | **Kept**, minus the sign-up switch (§2.2 — no self sign-up). |
| "primary button full-width" | **Kept.** Structure of the card. |
| "No frame at all … centred card, vertically centred" | **Kept.** This is a page shape, and it is the one §6.4 has no row for (§4.1). |
| "full-bleed **dark gradient background (deep purple → teal)**" | **Not kept.** Pure D7 territory. The ground is the designer's to derive from `--ev-*`. |
| "~475 px wide, ~16 px radius, ~34 px padding" | **Not kept as numbers.** Radius and padding come from the token set. The *proportion* — a narrow single-column card, not a page-width form — is structure and is kept. |
| "a row of three equal social-provider buttons beneath an `or` divider" | **Not kept.** No providers exist (§2.2). |
| "small legal links (`Help Privacy Terms`) at the card's bottom-left" | **Kept as a slot**, filled from Admin › Workspace's `legal` pane (foundation §3.4, Admin #2). |

**If the owner reverses D14** and wants auth to carry its own skin, the change is: the auth ground
and card get their own token subset in `globals.css`, and `docs/ref/tokens.md` grows a section
saying so. It is one file and one design-spec section. Nothing in §4–§9 of this spec changes.

---

## 4. Sign in

### 4.1 The screens, and the §6.4 row that does not exist

| # | Screen id | Route | §6.4 pattern row | Page shape |
|---:|---|---|---|---|
| 1 | `signin` | `/signin` | **NONE — see F-1** | Centred card, no frame |
| 2 | `signin-verify` | `/signin/verify` | **NONE — see F-1** | Centred card, no frame |
| 3 | `signin-enroll` | `/signin/enroll` | **NONE — see F-1** | Centred card, no frame |
| 4 | `forgot-password` | `/forgot-password` | **NONE — see F-1** | Centred card, no frame |
| 5 | `reset-password` | `/reset-password?token=…` | **NONE — see F-1** | Centred card, no frame |
| 6 | `set-password` (invite) | `/activate?token=…` | **NONE — see F-1** | Centred card, no frame |
| 7 | `reauthenticate` | **no route and no URL param** — it renders over whatever is mounted | **Not a page.** `alert-dialog` modal, 440 px | **Modal, scrimmed, focus-trapping** — **R4-3**; design §8.2 |
| 8 | `onboarding` | shell layer, `?onboarding=1` | **Guided checklist (§5.6)** — R4-2 | Shell layer, no scrim (§5.5) |

> **Row 7 is a correction, applied from design §15 overrule 5, sourced to `07-rulings-r4.md`
> R4-3.** This spec originally called re-authentication a fifth shell layer. It is not one, and
> the reason is §7.3.3's focus law — *the scrim decides the trap*. A no-scrim layer does not trap
> focus, so `Tab` would carry the operator out of the only working control on the screen and into
> the field of frozen controls §7.3 rule 2 puts behind it, with nothing to tell them they had
> left. A surface that must trap must have a scrim, and a scrimmed, non-dismissible, single-task
> surface is a modal by every row of §5.0. **Nothing in §7.3's guarantee changes** — the screen is
> not unmounted, the form is not cleared, the SaveBar stays up, the route does not change. R4-3 is
> a ruling about which overlay renders, not about the mount tree.

> **F-1 — CLOSED by R4-2.** The row and the fifth page shape were minted (`07-rulings-r4.md` §2,
> design §1.1): the six auth screens map to **Auth card — §2.5 D (structure only, D14), §4.2–4.4,
> §5.2**, page **shape 5 — centred card, no frame**. The escalation as originally written is kept
> below for its evidence trail.
>
> **F-1 (as escalated) — auth has no §6.4 row and no page shape, and I am not inventing either.**
> `docs/ref/patterns.md` maps *"All 41 Eyvar pages"* and states *"A page with no row here may not be
> designed until it gets one."* None of the 41 is an auth page. The four page shapes are single
> column, main + right rail, full-bleed editor, and monitoring shell; a centred card on a bare
> ground is none of them, and §2.5's rules for full-bleed surfaces are explicitly written for
> *editors* (inspector panels, device previews, an exit affordance in the bar) — `patterns.md` says
> so in its own trap list. `DESIGN.md` §2.5 **D** describes the anatomy but §6.4 never files it.
> **Escalation, to product-designer:** add a §6.4 row — `signin` `signin-verify` `signin-enroll`
> `forgot-password` `reset-password` `set-password` → **Auth card (§2.5 D)** — and add a fifth page
> shape, **centred card, no frame**, to `patterns.md`'s shape table and `DESIGN.md` §2.2. Both are
> edits to `docs/06-design-reference/_partials/06-eyvar-mapping.md` followed by
> `python docs/06-design-reference/build-design.py`. `DESIGN.md` is generated and never hand-edited.

> **F-2 — CLOSED by R4-2 and R4-3, and answered differently from how it was asked.** The
> guided-checklist row was minted (R4-2). The layer count went to **four, not five** (R4-3):
> `route.overlay` gains **`onboarding` and nothing else**, and re-authentication is a modal (row 7
> above). **One shell layer is open at a time**, and **entering `session-expired` closes every open
> layer first**, because a modal may not composite over a drawer (`00-decisions-r3.md` §1.2). Form
> state is preserved across that close; overlay state is not, and those are different things. The
> escalation as originally written is kept below.
>
> **F-2 (as escalated) — there is no §6.4 row for a guided checklist, and the shell has three layers, not four.**
> `DESIGN.md` §5.6 specifies the setup-guide card and the guide drawer in detail, but §6.4 files
> neither, because no Eyvar page had one. Foundation §4.3 declares **three** shell layers
> (`profile`, `notifications-all`, `my-account`) and §8.2's `route.overlay` is
> `entity | notifications | account | null`. Onboarding and re-authentication each need one.
> **Escalation, to product-designer and the shell owner:** a §6.4 row `onboarding` → **Guided
> checklist (§5.6) in a shell layer (§4.3, §5.5 no scrim)**; `route.overlay` gains `onboarding` and
> `reauth`; foundation §4.3 becomes five layers. This is a shell-owned file (`src/shell/*`) and a
> mock-data-engineer-owned file (`routeTable.ts`) — **requested, not edited by me.**

~~**Neither screen list may be designed until F-1 and F-2 land.**~~ **Both landed** — R4-2 and
R4-3, and `design/08-auth-and-onboarding.md` §1.1 designs against the minted rows. The rule
`patterns.md` sets was honoured, not gone around.

### 4.2 The decision: password **plus** a second factor, for everyone, every time

**Chosen: identifier + password → verification code.** Not password-only. Not
identifier-then-OTP (passwordless).

**Why, against this product specifically.**

- The people signing in hold `process_payouts`, `release_escrow` and `apply_deductions`
  (`:2833`–`:2834`), and can suspend a captain's livelihood. A single stolen password is a
  sufficient condition for moving money today.
- **The legacy app declares two-factor twice and enforces it zero times.** `require2FA:false` is a
  workspace setting (`:2572`), saved by `saveSecurityConfig` (`:8025`–`:8032`); `twoFA` is a
  per-user boolean (`:2831`) toggled by `toggleMa2FA` (`:3047`–`:3053`). Turning the workspace
  policy on renders a red `⚠ 2FA off` badge next to non-compliant operators (`:10456`) and does
  nothing else — there is no sign-in for it to block. The flag is *declared and never enforced*.
  A rebuild that keeps the toggle and still never enforces it would be worse than the legacy app,
  because it would now look deliberate.
- **Passwordless (identifier → OTP only) is rejected**, twice over. It makes possession of one
  phone or one mailbox the sole factor for a payout console, which is a downgrade, not an upgrade.
  And it makes "forgot password" — which the owner explicitly asked for — meaningless, because
  there would be no password to forget.

**Consequence, stated because it is a real product change:** the per-user `twoFA` toggle
(`:3023`, `:3047`) **stops being an operator-controlled switch**. Second factor is a property of the
console, not of the user. The workspace-level `require2FA` setting (`:8028`) is likewise
**retired** — a policy whose "off" state is "an operator who can release escrow may sign in with one
factor" is not a policy anyone should be able to set from a settings pane. What survives from the
account's security section is: *which* factor is enrolled, the phone or app it is bound to, and the
ability to re-enrol.

`TeamUser.twoFactorEnabled: boolean` in `src/data/types/session.ts` becomes
`secondFactor: { method: 'sms' | 'totp'; hint: string } | null`, where `null` means **enrolment
pending** and forces §4.4 at next sign-in. Named for mock-data-engineer in §10.1.

### 4.3 The state machine

```
                        ┌────────────────────────────────────────────┐
                        │                signin                      │
                        │  identifier + password                     │
                        └───┬───────────────┬───────────────┬────────┘
             credentials ok │       reject  │        network│failure
      device NOT remembered │               │               │
                            ▼               ▼               ▼
                   ┌─────────────────┐  generic       error state,
                   │ signin-verify   │  failure       inputs preserved,
                   │  6-digit code   │  (identical    Retry
                   └───┬─────────┬───┘  for unknown /
      correct & fresh  │         │ wrong / superseded / expired
                       │         └──► attempt counter (§5.4)
                       ▼
              secondFactor == null ? ──yes──► signin-enroll ──► verify ──┐
                       │ no                                             │
                       ▼                                                ▼
                 session issued ──► session.landingRoute ──► first-run? ──► onboarding layer
```

`credentials ok` **and** `device remembered` (§7.4) skips `signin-verify` and goes straight to the
session. Nothing else skips it.

### 4.4 Second-factor enrolment (`signin-enroll`)

Reached when the credential check succeeds and `secondFactor === null` — which is every operator on
their first sign-in, and every operator on the day the policy lands. Not skippable, not
dismissible, and **it is not onboarding**: onboarding is optional and this is not.

The operator chooses SMS to a phone number they enter, or an authenticator app. The number is
verified by completing one §5 challenge against it before the session is issued. `TeamUser.phone` is
nullable in the type and legacy seeds one for four of five users (`:2831`–`:2841`), so the field is
not a reliable pre-fill: it is shown as a suggestion, never as a default the operator can accept
without reading.

### 4.5 What the sign-in form does and does not tell the operator

**One failure message for three different causes** — unknown identifier, wrong password, and a
`Suspended` account all produce identical copy, identical field treatment, and (server-side)
indistinguishable timing. Distinguishing them turns the form into an account-enumeration oracle
against a roster of named employees.

**The one deliberate exception is the lockout message** (§9.1), and it *is* a small oracle: it
confirms that repeated attempts against that identifier were counted. The alternative — locking
silently and continuing to show the generic failure — leaves an operator on shift hammering a form
that will never work with no idea why, and their fix (call the Owner) requires knowing there is
something to call about. **Trade recorded, taken deliberately, not overlooked.**

**Inline field validation is format-only**: an identifier that is not a plausible email gets
`Enter a valid email address.` under the field, in the §4.4 treatment. That is the only thing the client is allowed to
judge.

> **The period is deliberate and it was a change.** `docs/ref/copy.md`'s exact-wording row spelled
> this string **without** a period; design §16 **F-3** showed R6 (*full sentences take a period*)
> beats `copy.md`, which is a condensation, and every inline field error in the design spec takes
> one. **The design spec is the source for this string** (design §3.2) — and **`copy.md` now
> agrees**: `:33` carries the period, and rule 8 at `:19` states that an inline field error is a
> sentence and takes one. **All three sources spell it identically; QA has one string to check.**
> Recorded because the three disagreed for a few minutes, and the next reader should not have to
> rediscover which one won.

---

## 5. Verification code

### 5.1 Shape

| Property | Value | Evidence |
|---|---|---|
| Length | **6 digits**, numeric only | `[inferred]` — no OTP exists in the legacy app. Matches the reference (the inherited capture shows a `000000` placeholder). |
| Lifetime | **10 minutes** from issue | `[inferred]` |
| Validity | **Single-use**, and **only the most recently issued code for a challenge is valid** | `[inferred]` |
| Binding | **Per sign-in attempt (a server-issued challenge id), not per device and not per session** | `[inferred]`. A code issued in one browser is invalid in another. This is what makes §9.5 correct. |
| Resend cooldown | **30 s, then 60 s, then 120 s**, per challenge | `[inferred]` |
| Resends per challenge | **5**, then the challenge must be restarted from `signin` | `[inferred]` |
| Delivery hint | The destination is shown **masked** — last two digits of the phone, or the app name | `[inferred]` |

### 5.2 Paste, and why there is no auto-submit

Pasting a 6-digit string into any position fills the whole input and moves focus to the submit
control. **It does not submit.** An auto-submit on the sixth character takes the code out of the
operator's hands the instant they mistype, burns an attempt against the counter in §5.4, and does it
at exactly the moment they can see the mistake on screen. The cost of not auto-submitting is one
keystroke; the cost of auto-submitting is a wasted attempt on a screen where the fifth wasted
attempt locks them out for fifteen minutes.

Pasted content is stripped of spaces, hyphens and non-digits before it is measured, because
`123 456` and `123-456` are what an SMS client copies.

**Focus moves on paste only, never on typing.** A paste is one atomic act whose whole result the
operator can see, so handing them the button is a favour. A typist's next keystroke after the sixth
digit would land on the button, where `Space` or `Enter` submits a code they have not read — the
same wasted attempt this section exists to prevent. Typing the sixth digit moves nothing; the caret
stays. **Applied from design §15 overrule 9; the design spec (§4.1 D-OTP-4) is the source.** This
narrows a sentence that only ever described pasting and was silent on typing — a gap, not a
disagreement.

### 5.3 The supersession rule — the most useful decision on this screen

The real-world failure on an OTP screen is not an attacker. It is an operator who pressed
`Resend`, then typed the **first** SMS because it arrived first and is higher up the list.

So the code the operator submits resolves to one of four outcomes, and **they are told which**:

| Outcome | What the operator sees | Counts toward the §5.4 attempt limit? |
|---|---|---|
| **Correct** | Signed in | — |
| **Superseded** — a valid code, but a newer one has been issued | *"That code has been replaced. Enter the most recent code."* | **No.** |
| **Expired** — past its 10 minutes | *"That code has expired. Request a new one."* + the resend control | **No.** |
| **Wrong** | *"That code is incorrect."* | **Yes.** |

Being specific here leaks nothing: the operator has already passed the password step, so their
identity is established. This is the one place in the auth flow where helpfulness costs nothing and
generic copy costs an operator their shift.

### 5.4 The 3rd and the 5th wrong attempt

Counted **per challenge**, wrong attempts only (§5.3).

- **On the 3rd wrong attempt** — the current code is invalidated server-side. The operator is told
  to request a new one; the input is cleared and the resend control is enabled immediately,
  ignoring the cooldown, because the code they were working against no longer exists. This stops a
  code being ground at leisure.
- **On the 5th wrong attempt** — the **challenge** is locked for **15 minutes**. Not the account.
  The operator returns to `signin` and cannot start a new challenge for that identifier until the
  window passes. A security notification is sent to the account's own address and an audit event is
  emitted (§12.3).
- **Nothing here is a permanent lock.** A permanent lock on an ops console is a
  denial-of-service against a shift, deliverable by anyone who knows an employee's email address.

The counter itself is **server-side**. A counter in the browser is a number the browser can reset
(§11).

---

## 6. Forgot password, reset, and activation

### 6.1 Request (`forgot-password`)

One field: the identifier. One primary action. One escape back to `signin`.

### 6.2 The confirmation is deliberately non-committal

After a request, the operator sees the same message whether the address exists or not:

> *A reset link is on its way to that address. It expires in 60 minutes.*

It renders as the soft in-card banner between the heading and the fields, which is where the
reference puts it (the inherited capture; `DESIGN.md` §5.2 Family B) — and
under D14 that placement is structure, so it is kept while its colour is not.

**On which card, and in which tone — both settled by the design spec.**

- **The card is `/signin`, not `/forgot-password`.** The reference frame shows the banner on a card
  headed `Log in` with the identifier still filled; submitting the request returns the operator to
  the sign-in card and the banner renders in its banner slot, between the subtitle and the
  identifier field. It is also the better outcome: the operator's next act is in their mailbox, and
  §6.3 deliberately keeps signing in normally from invalidating the link, so returning them to the
  form that lets them do it is the point. **Applied from design §15 overrule 7 (design §7.1);
  this spec was silent on which card, so this closes an ambiguity rather than reversing a
  position.**
- **The tone is `info`, not `success`.** The reference uses a green tick. Success asserts that
  something happened, which is the exact claim a non-committal confirmation exists to refuse; a
  green tick over a conditional sentence is a contradiction the operator reads faster than the
  words. **Design §7.2 is the source.** The sentence above — *"the placement is kept while its
  colour is not"* — already ceded tone to the designer, so design §15's clause 8 is a decision
  taken inside a boundary this spec drew, not an overrule of it (§19.2).

**Two things this requires that are not visible on screen**, both server guarantees (§11): the
response for a known and an unknown address must be indistinguishable **in wording and in timing**;
and the request endpoint is rate-limited per identifier and per source, or the confirmation's
discretion is undone by anyone willing to send a thousand of them.

### 6.3 The link

| Property | Value | Evidence |
|---|---|---|
| Lifetime | **60 minutes** | `[inferred]` |
| Uses | **Exactly one** | `[inferred]` |
| Invalidated by | being used · a newer reset request for the same account · a successful password change by any other route | `[inferred]` |
| **Not** invalidated by | the operator remembering their password and signing in normally in the meantime | `[inferred]` — deliberate: invalidating on sign-in strands anyone who does both. |
| Scope | one account, and it authorises **only** a password change — never a session on its own | `[inferred]` |

A reset does **not** sign the operator in. They complete §5 afterwards. Proving control of a mailbox
is one factor; the console asks for two.

### 6.4 The reset form (`reset-password`)

New password, confirm, a reveal control on each (`DESIGN.md` §4.2:
the inherited capture), and a strength meter under the first field.

**The policy is stated before the operator types, not after they fail.** Minimum **12 characters**.
No composition rules — no "must contain a symbol", which pushes people toward `Password1!` and
nothing else. A server-side check against a breached/common-password list, whose failure is the one
policy failure that can only appear after submission.

> **Recorded, current behaviour, suspected defect — D-A1.** The legacy floor is **8** characters,
> checked at `:3040` (`if(nw.length<8)`), in the browser, against a form that stores nothing. 12 is
> not a correction of a working check; it is a floor for a check that does not exist yet.

### 6.5 After a successful reset

Every other session for that account is terminated server-side, and the operator is told so. The device they are on continues to §5. Trusted
devices (§7.4) are **all revoked** — a password reset is the signal that something may be wrong,
and a remembered device that survives it is a factor the attacker may already hold.

### 6.6 Activation from an invite (`set-password`) — the transition that does not exist

`commitInvite` (`:10529`–`:10542`) creates `{status:'Invited', lastLogin:'Not yet'}` and toasts
*"✅ Invite sent"*. **Nothing is sent, and no code path anywhere in the file sets a team user's
status to `Active`.** `commitUserSwitch` refuses to act as an invited user (`:3103`) and the switch
modal greys them with *"invited — no login yet"* (`:3094`) — the product knows the state exists and
has no exit from it.

`/activate?token=…` is that exit: same form as §6.4, plus the enrolment step (§4.4), and on success
the account moves `Invited → Active`, `lastLoginAt` is set, and **onboarding starts** (§8.4). The
invite token's lifetime is **7 days** `[inferred]` and it is re-issuable by anyone holding
`manage_team`.

> **Recorded, current behaviour, suspected defect — D-A2.** `defaultPermissionsForRole` (`:10522`)
> returns `[]` when no current user holds that role, because it intersects the permission arrays of
> existing holders. **The first person ever invited into a role gets zero permissions** and a
> console with nothing in it. Independently recorded as `00c` F15/F16. Named here because onboarding
> is where it surfaces: a checklist whose every step is permission-denied (§8.8, `track-empty`).

---

## 7. Session

### 7.1 Lifetimes

| Property | Value | Evidence |
|---|---|---|
| **Idle timeout** | **30 minutes**, configurable **5–240** | `DB.opsConfig.security.sessionTimeoutMin:30` (`:2572`); clamp `Math.min(240,Math.max(5,…))` (`:8027`). Not invented — adopted. |
| **Absolute lifetime** | **12 hours**, not extendable by activity | `[inferred]`. One shift. |
| **Idle warning** | at **2 minutes** remaining | `[inferred]` |
| **Trusted-device lifetime** | **30 days** | `[inferred]` |
| **Role / permission re-read** | on window focus, and at most every **5 minutes** while focused | `[inferred]` |

The idle setting lives in Admin › Team & Access, which absorbs the legacy `security` pane
(foundation §3.4, Admin #3). It is the same number, in the same place, now attached to something
real.

### 7.2 The idle warning

A **shell banner**, not a modal and not a toast. R10: a countdown is a standing condition that
outlives any toast, and a modal would block the work the operator is in the middle of doing — which
is the work the timeout is about to interrupt. It names the remaining time and carries one action,
`Stay signed in`, which extends the idle window and nothing else. The banner appearing does **not**
extend it; only the operator acting does.

### 7.3 Expiry, and the unsaved-work guarantee

**This is the most important rule in §7 and it is the one an implementation will get wrong.**

The shell has a dirty-state contract: `ui.saveBar` with `clean | dirty | dirty-invalid | saving`
(foundation §8.3), a `navigate-away-dirty` state that intercepts route changes with a modal
(foundation §9.2), and a live `SaveBar` (`src/shell/SaveBar.tsx`). A session that expires while a
Finance lead is halfway through a payout adjustment must not throw that away.

**The rule:**

1. Session expiry **never unmounts the screen, never clears a form, never reloads, and never
   redirects** while the active route is dirty.
2. The shell enters `session-expired`: every mutating control is disabled in place with the reason
   named (§11.2 of foundation: *gate at render, not at commit*), reads stop, and the
   **`reauthenticate` modal** opens (§4.1 row 7; R4-3; design §8.2). **Entering `session-expired`
   closes every open shell layer first**, because a modal may not composite over a drawer
   (`00-decisions-r3.md` §1.2). Form state survives that close; overlay state does not.
3. Re-authentication returns the operator to **the same route, the same view, the same scroll
   position, with the form still dirty and the SaveBar still up.**
4. If the route is **clean**, expiry may redirect to `/signin` — there is nothing to lose, and a
   clean redirect is a clearer signal than a layer.
5. `Sign out` is explicit and goes through the existing `navigate-away-dirty` modal. Only the
   operator discards their own work.

> **Cost, stated for the frontend engineer to respond to, not decided by me.** Rule 1 means the
> sign-in surface must exist **twice**: as a standalone route outside `AppLayout`, and as a layer
> over a mounted, authenticated-a-moment-ago app. That is a real structural cost — two mount points
> for one form, and a re-auth path that must not be able to switch identity mid-session (§7.6). If
> the engineer judges it too expensive, the alternative is to **persist the dirty form**, which
> needs **Q1** and is worse besides (a half-written payout adjustment in a browser store is a
> different problem). **Do not resolve this by dropping the guarantee.**

### 7.4 `Remember this device`

A checkbox on `signin`, off by default.

- It remembers **the device for the second factor only**, for 30 days. It never remembers the
  password and never keeps a session alive.
- It appears in the account's device list, which already exists as a display —
  `DB.loginSessions` (`:2994`–`:3003`), rendered at `:3005`–`:3033` with device, location, IP and
  last-active, a `This device` badge, and a per-row `Log out` (`:3025`). That list becomes real and
  gains a trusted-device marker and a `Stop trusting` control.
- Revoked wholesale by a password reset (§6.5) and by `Sign out everywhere`.
- **Re-authentication after an idle expiry (§7.3) requires the password**, and the second factor
  only if the device is not trusted. The tab has been continuously open; the device has not changed.

### 7.5 Sign out

Single session, or `Sign out everywhere`. Legacy's per-row logout uses a native `confirm()`
(`:3059`) and mutates the array in place; the confirm becomes a §5.3 dialog naming the device, and
`Sign out everywhere` names how many sessions will end.

### 7.6 Identity does not change on re-authentication — enforced by an absent field, not by a check

The `reauthenticate` modal is bound to the `userId` of the session that expired. Without this rule,
a mounted app holding one operator's dirty form can be handed to another operator's session and the
audit log will attribute the save to the second person — which is `00c` **F5** (impersonation
misattributes actions because `logAction` reads the already-reassigned `CURRENT_USER_ID`, `:3138`)
recreated in a new place.

**The mechanism changed, and the change is right.** This spec originally required that signing in
as a different operator be **refused**. Design §8.2 removes the identifier field from the surface
altogether: the account is rendered as **static text** bound to the expired session's `userId`, the
only credential control is the password field, and `Sign out` is the named path to a different
account. **Applied from design §15 overrule 3, and the design spec is the source.** The designer's
argument holds on its own terms — a refusal is a check that can be forgotten, an absent field
cannot be, and `00c` F5 is the cost of forgetting it once. Prevention beats refusal here because
the refused case has no legitimate user: nobody has ever needed to become a second operator inside
a first operator's unsaved form.

> **What an absent field does not do, and why AC-567 is written the way it is.** Removing the
> control removes the *UI* path. It does not, on its own, guarantee that `auth.reauthenticate`
> rejects an identity that is not the expired session's — and a criterion that asserts only an
> absence is unfalsifiable in the direction that matters, because a QA engineer cannot search the
> space of all controls that might one day be added. **AC-567 therefore tests three things: a
> closed inventory of the surface's controls, the request's shape, and the identity of the session
> that comes back.** The inventory is the testable form of "there is no identifier field"; the
> other two are the guarantee the field's absence is supposed to deliver, stated so it survives
> somebody re-adding the field. §11.1 already places identity binding on the server; this is that
> guarantee made checkable from the client.

---

## 8. Role-based onboarding

### 8.1 The roles that actually exist — a correction before the matrix

The brief, and the shape of the legacy fixture, suggest five roles. There are **four**:

```js
var TEAM_ROLES=['Owner','Ops Manager','Finance','Support'];   // :10501
```

Five *users* are seeded across those four roles — `Support` appears twice, `USR-3` Lina and `USR-4`
Noura (`:2835`, `:2837`) — and `USR-4` is the `Invited` account that has never signed in. So the
onboarding cohort in the fixture is one person, and she cannot get in (§6.6).

`RoleName` in `src/data/types/session.ts` already says four. **`Trust & Safety` and `Dispatcher`
are proposed and absent** (`ProposedRoleName`, and DECISIONS **D4**, which is the same open question
as foundation §12.2 **Q3**).

### 8.2 The position: a checklist, in a shell layer. Not a tour, not an empty state.

**Not a tour.** `DESIGN.md` §5.6: *"MUST NOT use modal wizards, coach-mark tours, or blocking
overlays for onboarding."* That is a structural rule about interaction, not a visual one, so D7
leaves it standing. A coach-mark tour also breaks the moment a sub-tab is renamed or merged, and
this product merged seven pages in D1.

**Not an empty-state affordance.** Both empty slots are taken and one of them is taken *by a rule*.
R8's first-run empty means *"nothing has ever existed here"*, and wave 2 added **E1 `queue clear`**
with an explicit prohibition — Q-36: *"E1 must never render the first-run illustration … An
operator who has just cleared the Requests queue must not be shown an illustration telling them no
requests exist."* Hanging onboarding off an empty state would put a training checklist in front of
an operator at the exact moment they have finished their work, which is the opposite of the signal.

**So: a checklist, in a shell layer**, per §5.6's setup-guide anatomy — `n / m completed`, a
progress bar, one expanded task at a time, description + one primary action per expanded task,
manual `Mark as done` as well as auto-detection, and `Dismiss` that does not resurrect.

> **`Learn more` is not rendered, on any step, and that is a recorded content gap — not a
> deferral and not an oversight.** §5.6 **SHOULD**s a `Learn more` link on every guide task and
> `copy.md` rule 11 gives its exact form. **Eyvar has no help centre, so there is no destination
> for it to have.** All 21 steps therefore ship `learnMoreKey: null` (§8.9), the design spec
> renders nothing rather than a dead link (design §10.2, §14 **A-7**, §16 **F-2**), and no
> acceptance criterion requires the link. A SHOULD that cannot be met is stated here as unmet
> rather than left standing to be silently failed. **The gap is content, not design: somebody has
> to write 21 help articles and put them somewhere before this SHOULD becomes reachable.**
> Recorded as **Q-82** (§16).

**Why the layer and not a card on the landing page.** The landing page differs by role
(`session.landingRoute`), so a card would have to be added to five different Overview screens owned
by five different engineers in wave 4. The layer is one surface in `src/shell/`, one owner, and it
is already the mechanism for `profile`, `notifications-all` and `my-account` (foundation §4.3). It
has **no scrim** (§5.5), so the workspace behind stays visible and readable — which is precisely
why auto-opening it once is not the "blocking overlay" §5.6 forbids. The operator can read the step
and the screen it is about at the same time.

**Entry point:** the account menu, permanently, carrying `n / m` while the track is incomplete and
undismissed.

### 8.3 The intro

The first thing in the layer, above the steps, is the intro the owner asked for. Three parts, all
keyed:

1. **Who they are here** — the role name and one sentence of what that role is accountable for.
2. **What they can and cannot do** — the count of permissions held, and, where the role is
   *deliberately* bounded, the boundary named. For Support that sentence is load-bearing (§8.5).
3. **Where their work arrives** — one line pointing at Operations › My Work, which is the only
   surface that projects every queue (`02-work-queues.md` §7).

### 8.4 How the product knows it is their first time

**Server-side, and deliberately not client-side.**

- The signal is the account itself: `TeamUser.status === 'Invited'` → activation (§6.6) sets
  `status: 'Active'`, `lastLoginAt`, and creates the onboarding state.
- Completion lives in a resource — `GET/PATCH /me/onboarding` — for the same reason
  `UserPreferences` does (`src/data/clients/session.ts`): *"Modelled server-side because that shape
  survives whichever way Q1 goes."*

**What onboarding needs from Q1: nothing.** This is a deliberate design decision, not an
assumption. Ops operators share machines and change desks between shifts; a checklist in
`localStorage` restarts for a person who has already done it and stays "complete" for the next
person who sits down. Q1's answer therefore **does not block any acceptance criterion in this
spec.** The single thing that would use it is a nicety — remembering which task accordion was
expanded — and it degrades, with no gap and no `[inferred]` guess, to *"the first incomplete step is
expanded"*.

### 8.5 The step sequence, per role

Every step names a real sub-tab from foundation §3.4 and a real task from the wave 2 or wave 3
spec. **No step says "explore the dashboard."**

**Steps 1–3 are common to every role.**

| # | Step | Destination | The task | Grounded in |
|---:|---|---|---|---|
| 1 | Check the account that is now yours | `my-account` layer, security section | Confirm the number your codes go to; review active sessions and end anything you do not recognise | `:2994`–`:3033`; §4.4, §7.4 |
| 2 | See where your work arrives | Operations › My Work, view `Unassigned` | **Claim one item, then release it.** Learn what a claim is before you are holding six | `02-work-queues.md` §4.2, §7.3; AC-282, AC-288 |
| 3 | Know that everything you do is recorded, and who to call | Admin › Activity Log; the on-call pair | Find your own name in the log. Read who is on call | `DB.auditLog` `:2863`; `DB.onCall` `:15776`; foundation §3.4 Admin #7 |

**Owner** — 13 of 13 permissions (`:2831`–`:2832`).

| # | Step | Destination | The task |
|---:|---|---|---|
| 4 | Know who can do what | Admin › Team & Access | Read the role matrix. **`manage_settings` is held by one person and gates 39 of 131 guards** (`00c` F27) — decide whether that is still acceptable |
| 5 | Confirm the policy you are accountable for | Admin › Operational Policy | Read dispatch radius, operating limits, SLA targets and reason codes once, deliberately |
| 6 | **State the current contribution margin** (`owner.position`) | Financials › Overview — **the one destination AC-630 permits, named there and nowhere else** | The trial balance and the contribution margin are the two numbers the Owner is asked about, and they live on no other sub-tab (foundation §3.4 Financials row 1: `finance` contribution margin + pane `ledger` trial balance). The step is done when the Owner can say them out loud |
| 7 | Settle the pricing model | Financials › Pricing & Plans | **The product computes captain earnings four different ways and nobody has picked one** (`03-financials.md` §4, **Q7**). This step's content is that the decision is outstanding and it is yours |

> **Owner step 6 contradicted AC-630, and the contradiction was mine.** AC-630 banned every
> workspace-Overview destination outright; §8.5 handed the Owner one. Design §15 overrule 4 found
> it and I have verified it: foundation §3.4 makes `Overview` the first sub-tab of all five
> workspaces, so `Financials › Overview` is a workspace Overview by definition, and the criterion
> and the step could not both be right.
>
> **The fix is a named exception, not a deleted destination**, and the alternative was weighed:
> banning the destination and moving the two numbers into the step body keeps AC-630 absolute, and
> it does not work. Step bodies are **static i18n fixture strings** (`bodyKey`, §8.9), so a body
> cannot carry a live trial balance or a live contribution margin — it can only carry their
> *names*, which turns the step into *"go find two numbers, somewhere"*: no destination, manual
> completion only, and an Owner sent hunting. That is a worse step than the one AC-630 was written
> to prevent.
>
> **What AC-630 actually defends is intact.** It exists to stop *"explore the dashboard"* steps —
> and `PROPOSED-STRUCTURE.md` §2.1 **P4** (*"Overview sub-tabs read; they never act"*) means a read
> task is the only kind an Overview can honestly carry. `owner.position` names two facts the
> operator must be able to state afterwards, which is **AC-629**'s bar, and AC-629 is the criterion
> that catches a tour-of-a-screen step. AC-630's remaining job is to keep the exception from
> multiplying, so it is rewritten as a **closed allow-list of exactly one step id**, plus one
> clause this spec should have carried from the start: **no step's destination is the operator's
> own `session.landingRoute`.** That is the real *"explore the dashboard"* ban — sending an
> operator to the screen they land on every morning teaches nothing — and all 21 steps already
> satisfy it, so it creates no design work. It is also what makes the exception principled rather
> than arbitrary: `financials/overview` **is** the Finance role's landing route and **is not** the
> Owner's (foundation §3.4 rows 3 and 1), which is exactly why the step is worth an Owner's time
> and would be worth nothing to a Finance lead.

**Finance** — `process_payouts`, `release_escrow`, `apply_deductions`, `view_finance`,
`view_profiles` (`:2833`–`:2834`).

| # | Step | Destination | The task |
|---:|---|---|---|
| 4 | Read a ledger before you post to one | Financials › Revenue & Refunds, `All postings` | The sign convention, and that **a posted row is never edited — it is reversed** (`03-financials.md` §3.2, §3.5, §3.6) |
| 5 | Understand what release means | Financials › Payouts & Escrow, `Escrow` | Open one escrow row and read what releasing it does, **without releasing it** |
| 6 | Work one cash reconciliation item | Financials › Cash & Captain Debt, `Reconciliation queue` | Claim it, decide it, watch the row convert in place (`03-financials.md` §5 row 4 — this view is a §8.4 work queue) |
| 7 | Find the cap that bounds a goodwill credit | Financials › Rider Wallets, `Goodwill` | `compensationCapHalalas` (legacy `compPolicy`, `:15379`) — yours and Support's |
| 8 | Know which queue reaches you | Operations › My Work | **Disputes route to Finance** (`02-work-queues.md` §7.4). Turn role routing off once and see the difference |

**Ops Manager** — `approve_drivers`, `manage_subscriptions`, `live_ops`, `manage_plans`,
`view_finance`, `manage_tickets`, `view_profiles`, `contact_users` (`:2839`–`:2840`).

| # | Step | Destination | The task |
|---:|---|---|---|
| 4 | Decide one captain application end to end | Operations › People, `Applications` → applicant detail | Read the documents, then approve or reject. **D8:** the row offers ✓, ✗ and View, not a kebab |
| 5 | Work the Requests queue | Operations › Requests | Claim → SLA clock → disposition. Read what a **breach** means and what it is not (`02-work-queues.md` §4.3, §4.4) |
| 6 | Cover a trip before it departs | Operations › Trip Assurance, `No backup captain` | Register or replace a captain on one uncovered subscription (`02-work-queues.md` §6) |
| 7 | Watch a live trip without touching it | Operations › Live Dispatch | Read the freshness line. Know the difference between a stale feed and a dead one (foundation §8.1.3) — **wave 6; see §8.7** |
| 8 | Know the case you will be asked to answer | Support › Captain Fairness | Open one suspension appeal and read the captain's economics view (`02-work-queues.md` §9.5) |

**Support** — `manage_tickets`, `view_profiles`, `contact_users` (`:2835`–`:2836`). Three
permissions, and the boundaries matter more than the capabilities.

| # | Step | Destination | The task |
|---:|---|---|---|
| 4 | Answer one ticket | Support › Tickets | Open → respond → resolve, with a reason code — **wave 5; see §8.7** |
| 5 | Open a 360° profile, and know what you may not do with it | `profile` shell layer, from any rider or captain | This is every PII surface in the product across 11 entity types. **`view_profiles` is enforced nowhere today** (`00c` F9) and becomes a real gate (foundation §11.2) |
| 6 | Credit a rider, inside your cap | Financials › Rider Wallets, `Goodwill` | The one money action a support agent legitimately takes mid-call, and it is policy-bounded (`:15379`) |
| 7 | **What you may not decide, and who does** | Support › Safety & Incidents (read-only) | A safety incident is visible to you and **decided by an Ops Manager**. With three permissions the role is not equipped for a suspension decision (`PROPOSED-STRUCTURE.md` §13.1 R5; `02-work-queues.md` §7.4, Q-51). **This step's entire content is a boundary — and it is the step most likely to change under D4** (§8.6) |

**Trust & Safety** and **Dispatcher** — **no track. D4 is open.** If the two roles are adopted,
their tracks are §8.6, and they are a fixture edit.

### 8.6 What changes under each D4 outcome

Structured so that D4 landing is **a data edit to `onboardingTracks.ts`**, never a rewrite. The
tracks are fixtures keyed by `RoleName`; the steps are rows keyed to a `subTabId` from the route
table.

| D4 outcome | What moves | Which acceptance criteria change |
|---|---|---|
| **Option 1 — adopt both roles and the three settings keys** | Two new tracks. Support step 7 changes from *"decided by an Ops Manager"* to *"escalated to Trust & Safety"*. Ops Manager step 5 gains a Dispatcher hand-off line. Owner step 5 splits: `manage_ops_policy` moves to a new **Ops Manager step 9** (Admin › Operational Policy becomes reachable without the founder — which is D4's stated reason for existing) | **AC-617** (four tracks → six) · **AC-624** (Ops Manager step count 5 → 6) · **AC-628** (Support step 7 wording and destination) · **AC-610** (the permission each step's destination requires) |
| **Option 2 — keep today's four roles** | Nothing moves. Support step 7's *"until D4"* qualifier is deleted and the boundary becomes permanent | **AC-628** only — the wording loses its conditional |
| **Option 3 — settings split only, roles deferred** | Owner step 5 splits as in option 1; Support step 7 unchanged | **AC-619** (Owner step count 4 → 5) · **AC-624** (Ops Manager 5 → 6) · **AC-610** |

**Permissions named here that do not exist yet:** `manage_ops_policy`, `manage_workspace`,
`manage_data_governance` (`PROPOSED-STRUCTURE.md` §10.5, D4). Three steps reference destinations
those keys would gate; today all three resolve through `manage_settings`, held by one person.
`manage_security_policy` — the idle timeout, the trusted-device window, the enrolment policy in
§7 — **does not exist under any proposal** and is currently inside `manage_settings`. It is named in
§16 as **Q-78**.

### 8.7 Steps whose destination is not built yet

Two steps point at sub-tabs that land in later waves — Ops Manager 7 (Live Dispatch, wave 6) and
Support 4 (Tickets, wave 5). A step whose `subTabId` is absent from the route table, or whose route
resolves to a not-yet-built screen, **renders disabled in place with the reason named** — never
hidden, never a dead link, and never counted in the track's total. This is §11.2's rule (*"Disabled
actions MUST render greyed in place; do NOT hide actions that are merely unavailable"*) applied to
a checklist, and it is why the steps are fixture rows keyed to `subTabId` rather than hardcoded
paths.

### 8.8 Dismiss, skip, resume, restart, and the role change

| Action | Behaviour |
|---|---|
| **Skip a step** | **Withdrawn by the owner.** There is no Skip control and no `Skipped (n)` group; a step is done or it is not done. The data layer keeps `skipStep` and `skippedStepIds` and the UI never writes them. See AC-632 to AC-634 |
| **Track complete** | Every step is done **or** skipped. The card collapses to the §5.6 `✓ Done` line and reveals `Dismiss` |
| **Dismiss** | Available **at any time**, not only at completion. This is a deliberate extension of §5.6, which only makes a *completed* guide dismissible: an operator on their first shift can be handed a live safety incident in minute four, and a checklist they cannot close is a trap. §5.6's *"MUST NOT resurrect it afterwards"* is honoured exactly — a dismissed track never auto-opens and never raises a banner again |
| **Resume** | The account-menu entry is permanent. It carries `n / m` while the track is incomplete and undismissed, and no indicator otherwise |
| **Restart** | `Restart onboarding` in the layer. Clears completions **for the current track only** and un-dismisses. Also available to a holder of `manage_team` against another operator, from Admin › Team & Access — for a role change, or for a new hire shadowing an experienced one |
| **Role change** | The new track is computed. **Any step id present in both tracks and already completed stays completed** — steps 1–3 are shared, so nobody redoes them. If the new track has ≥1 incomplete step, the state returns to in-progress and **one banner** is raised (a standing condition, R10) naming the new role and offering to open the checklist. **It never auto-opens** — the operator may be mid-task. Steps completed under the old role that the new role cannot reach are **archived, not deleted**: a demotion must not read as regression |

### 8.9 Data — onboarding

**Derived** = computed, never stored, never editable (§8.2 of `DESIGN.md`).

`OnboardingStep` — fixture, one row per step per track:

| Field | Type | Source | Derived |
|---|---|---|:--:|
| `id` | string, stable, e.g. `common.sessions`, `ops.requests.claim` | fixture | — |
| `trackRole` | `RoleName` | fixture | — |
| `order` | integer | fixture | — |
| `titleKey` / `bodyKey` | i18n key · i18n key | fixture | — |
| `learnMoreKey` | i18n key \| null — **`null` on all 21 rows, today and until Q-82 is answered.** The field exists so the gap is visible in the data; nothing renders when it is `null` (§8.2, design §10.2) | fixture | — |
| `destination` | `{ subTabId, view?: string, layer?: 'profile' \| 'account' } \| null` | fixture; `subTabId` **must** exist in the route table | — |
| `completion` | `auto` \| `manual` | fixture | — |
| `autoSignal` | string \| null — a named domain event id, e.g. `queue.item.claimed` | fixture | — |
| `requiredPermission` | `PermissionKey` \| null | fixture | — |
| `available` | boolean — the destination's sub-tab exists **and** is built | route table | ● |
| `reachable` | boolean — `available` **and** the operator holds `requiredPermission` | session + route table | ● |

`OnboardingState` — per operator, server-backed (§8.4):

| Field | Type | Source | Derived |
|---|---|---|:--:|
| `userId` | string | server | — |
| `trackRole` | `RoleName` | server, from the account's current role | — |
| `startedAt` | `IsoDateTime` | server | — |
| `completedStepIds` | string[] | server | — |
| `skippedStepIds` | string[] | server | — |
| `archivedStepIds` | string[] — completed, then made unreachable by a role change | server | — |
| `dismissedAt` | `IsoDateTime` \| null | server | — |
| `completedAt` | `IsoDateTime` \| null | server | — |
| `doneCount` / `totalCount` | integer | — | ● `total` counts **reachable** steps only |
| `isComplete` | boolean | — | ● every reachable step is done or skipped |

---

## 9. States

### 9.1 Auth — every state, named

The four base states apply to each of the six auth screens. Loading and error on an auth screen are
not decoration: a sign-in that hangs with a spinner and no timeout is the single most common way an
operator loses a shift.

| State | Trigger | What the operator sees |
|---|---|---|
| **content** | The screen mounted, fields empty or filled | The card |
| **empty** | **Not applicable.** An auth card has no records; there is nothing to be empty of. Recorded so nobody builds an empty state that cannot occur | — |
| **loading** | A submission is in flight | The primary shows progress and cannot be re-triggered; the fields stay **readable and their values preserved**; nothing is unmounted |
| **error** | The request failed at the transport level | An error in the card naming what happened and offering retry. **The identifier is preserved. The password is not** |
| `credentials-rejected` | Unknown identifier · wrong password · `Suspended` account | One message, identical for all three (§4.5). Password cleared, identifier kept, focus to the password field |
| `challenge-locked` | 5th wrong code (§5.4) | Return to `signin`; *"Too many attempts. Try again in {minutes}."* The sole deliberate oracle, traded knowingly (§4.5) |
| `account-invited` | The identifier belongs to a `status:'Invited'` account | **Same generic rejection as any other failure**, because "that account exists but has not been activated" names an employee. The path back in is a re-issued invite from a `manage_team` holder |
| `code-sent` | A challenge was issued | The verify card, with the masked destination and the resend control on cooldown |
| `code-wrong` | §5.3 wrong | *"That code is incorrect."* Attempt counter ticks |
| `code-superseded` | §5.3 superseded | *"That code has been replaced. Enter the most recent code."* Counter does **not** tick |
| `code-expired` | §5.3 expired | *"That code has expired. Request a new one."* Counter does **not** tick. Resend enabled regardless of cooldown |
| `code-invalidated` | 3rd wrong attempt (§5.4) | Input cleared, resend enabled immediately, instruction to request a new code |
| `resend-cooldown` | Resend pressed | The control is disabled with the remaining seconds visible and counting |
| `resend-exhausted` | **Five codes sent for one challenge** — the opening code plus four resends; the next press is refused | Return to `signin` and start again. Copy: *"Five codes were sent for this sign-in."* **Codes, not resends — AC-533** |
| **`challenge-missing`** | There is no open challenge for this browser context: `/signin/verify` opened directly, reached by browser back-then-forward after a consumed code, or a code issued in a different browser context (§5.1 binding row) | The whole card is replaced — no code field. A heading naming that the verification is no longer open, and one primary back to `signin`. **Added from design §15 overrule 6**; **AC-530**, **AC-531** and **AC-582** all require it and none of them had a named state to be designed against. The omission was mine |
| **`challenge-completed-elsewhere`** | The same challenge was completed in another tab (§9.1's two-tab case) | The field and primary go read-only; a banner states that this sign-in finished in another tab and that the console is already open there, with a route back to `signin` for a second session. **Added from design §15 overrule 6**; **AC-583** requires it and requires that the tab *say so rather than hang* |
| `enrolment-required` | `secondFactor === null` | `signin-enroll`. No skip, no dismiss, no route out except signing out |
| `reset-requested` | §6.2 | The non-committal in-card banner |
| `reset-token-invalid` | Unknown, used, superseded or expired token | One state for all four — *"This link is no longer valid. Request a new one."* — with the request action. Distinguishing them tells a link-holder which kind of link they have |
| `reset-succeeded` | §6.5 | Success banner naming that other sessions have ended; continue to §5 |
| `password-rejected` | Server policy failure, incl. the breached-password list | Inline under the field, naming the rule that failed. The **only** policy failure that can appear after submission |
| `offline` | No connectivity | The card states it, submission is disabled with the reason named, and **nothing is cleared**. §5.2's merge rule: one banner |
| `session-idle-warning` | 2 minutes remaining (§7.2) | Shell banner + `Stay signed in` |
| `session-expired-clean` | Expiry, route not dirty | Redirect to `/signin` with a stated reason |
| `session-expired-dirty` | Expiry, route dirty (§7.3) | App stays mounted, mutations disabled in place, every open shell layer closes, the **`reauthenticate` modal** opens, SaveBar stays up |
| ~~`reauth-wrong-identity`~~ **retired** | — | **This state cannot occur and is no longer designed.** The re-auth modal has no identifier field (§7.6), so there is no gesture that reaches a wrong-identity refusal. The state is left in the table struck through, rather than deleted, so that nobody re-adds the field and then wonders where the refusal state went. **Retired under design §15 overrule 3** |
| `role-revoked-in-session` | Permissions changed while signed in | Foundation's `role-switched`: rail, sub-tab list and every count re-derive; a now-forbidden route shows `route-forbidden`, **not** a redirect |
| `write-permission-revoked-while-dirty` | The permission that authorises the pending save was removed | `Save` disables with the reason named; `Discard` stays enabled; the form's content stays on screen and selectable. **Never a silent drop** |

### 9.2 Onboarding — every state

| State | Trigger | What the operator sees |
|---|---|---|
| **content** | A track with ≥1 reachable step | Intro, progress line, step list |
| **empty — `track-empty`** | Zero reachable steps. Real and reachable: D-A2 gives the first holder of a role an empty permission array | **Not the R8 first-run illustration.** One sentence naming that no step is available to this role yet, and who to ask (`manage_team` holder) |
| **loading** | `onboarding.get` in flight | A skeleton shaped like the step list — not a spinner |
| **error** | `onboarding.get` failed | Error inside the layer with retry. **The layer does not close and the console behind it keeps working** |
| `step-unreachable-unbuilt` | Destination sub-tab not built yet (§8.7) | Step disabled in place, naming the wave/reason. Excluded from `totalCount` |
| `step-unreachable-forbidden` | `requiredPermission` not held | Step disabled in place, naming the permission and who grants it. Excluded from `totalCount` |
| `step-mark-failed` | `onboarding.completeStep` failed | The step returns to not-done, an inline retry in the row. **Not a toast alone** — the condition outlives the toast (R10) |
| `dismissed` | §8.8 | Layer closed; account-menu entry present without an indicator; no auto-open, no banner, ever again |
| `completed` | Every reachable step done or skipped | `✓ Done` + `Dismiss` |
| `role-changed` | The account's role changed | One banner naming the new role, offering to open the checklist. Never auto-opens |
| `archived-steps-present` | Steps completed under a former role, now unreachable | A collapsed `Completed under a previous role (n)` group. Not deleted, not counted |
| `stale-state` | A `PATCH` conflicts with a newer server state (two tabs) | The layer re-reads and re-renders; the operator's action is applied if it is still valid, and named if it is not |

---

## 10. What the mock layer must provide

### 10.1 New and changed types

- **New client** `src/data/clients/auth.ts`.
- **New client** `src/data/clients/onboarding.ts`.
- **Changed** `src/data/types/session.ts`: `TeamUser.twoFactorEnabled: boolean` →
  `secondFactor: { method: 'sms' | 'totp'; hint: string } | null` (§4.2).
- **Changed** `src/data/types/session.ts`: `TeamUserStatus` keeps `Invited`, and a real
  `Invited → Active` transition exists for the first time (§6.6).
- **New** `src/data/fixtures/onboardingTracks.ts` — four tracks (§8.5), keyed by `RoleName`.
- **New** `src/data/fixtures/authIdentities.ts` — §10.3.
- **Extended** `SESSION_OPERATIONS` with `session.devices`, `session.revokeDevice`,
  `session.trustDevice`.

### 10.2 Operation ids — every one, and what it is for

Registered through `mock()` / `mockMutation()`, so `?mockFail=` reaches all of them
(`src/data/config.ts`, `src/data/mock/delay.ts`).

| Operation id | Purpose | Which AC it makes reachable |
|---|---|---|
| `auth.signIn` | Credential submission | AC-511 |
| `auth.verifyCode` | Code submission | AC-535 |
| `auth.resendCode` | Resend | AC-536 |
| `auth.enrollSecondFactor` | §4.4 | AC-516 |
| `auth.requestPasswordReset` | §6.1 | AC-549 |
| `auth.validateResetToken` | Landing on `/reset-password` | AC-550 |
| `auth.resetPassword` | §6.4 submission | AC-551 |
| `auth.activateInvite` | §6.6 | AC-556 |
| `auth.reauthenticate` | §7.3 | AC-574 |
| `auth.signOut` | Single session | AC-575 |
| `auth.signOutEverywhere` | All sessions | AC-576 |
| `session.current` | **Exists.** Boot read | AC-590 |
| `session.refresh` | Role/permission re-read (§7.1) | AC-587 |
| `session.devices` | The device list (`:2994`) | AC-652 |
| `session.trustDevice` / `session.revokeDevice` | §7.4 | AC-571 |
| `onboarding.get` | Track + state | AC-649 |
| `onboarding.completeStep` | Mark done | AC-646 |
| `onboarding.skipStep` | — kept at the seam, never called from the UI (AC-632) | AC-647 |
| `onboarding.dismiss` | Dismiss | AC-647 |
| `onboarding.restart` | Restart, self or via `manage_team` | AC-640 |

### 10.3 Domain outcomes are fixtures, not injected failures — and this is a real distinction

`?mockFail=` produces a `503 / kind:'server' / retryable:true` `ApiError`
(`defaultInjectedError`, `src/data/config.ts`). That is correct for a **transport** failure and
wrong for a **domain** one: a wrong password is not a 503, and a screen that treats it as one will
show a `Retry` button where it should show a field error.

**So the two are reached differently, and both must work.**

**Transport failures — `?mockFail=<op>`.** Network, timeout, server. Every operation in §10.2.

**Domain outcomes — deterministic fixture identifiers.**

| Identifier | Outcome |
|---|---|
| `sarah@eyvar.com` | Owner, happy path (`:2831`) |
| `yousef@eyvar.com` | Ops Manager, happy path (`:2839`) |
| `fahad@eyvar.com` | Finance, happy path (`:2833`) |
| `lina@eyvar.com` | Support, happy path (`:2835`) |
| `noura.f@eyvar.com` | `Invited`, never activated (`:2837`) — generic rejection (§9.1 `account-invited`) |
| `locked@eyvar.com` | **new fixture** — challenge locked, 12 minutes remaining |
| `suspended@eyvar.com` | **new fixture** — `Suspended`; generic rejection |
| `newrole@eyvar.com` | **new fixture** — Ops Manager with `permissions: []`, so `track-empty` (§9.2) is reachable. This is D-A2 made visible |
| anything else | Generic rejection, same copy, same latency |

**Codes.** `123456` correct · `000000` expired · `111111` superseded · `999999` challenge-locked ·
any other 6 digits wrong.

**Reset / invite tokens.** `?token=valid` · `expired` · `used` · `superseded` · anything else
unknown.

### 10.4 One request to mock-data-engineer

`seedMockFailuresFromLocation` can only produce the 503. A QA engineer on a deployed preview cannot
reach a `429 rate-limited` or a `401 unauthorized` from the URL, though `mockFailures.always(op,
error)` accepts a custom `ApiError` from a console. **Requested:** extend the parse to
`?mockFail=auth.signIn:429`, mapping the status through the existing `kindForStatus`. Small, and it
is the difference between §11's rate-limit states being testable on a preview build and being
testable only in a unit test. **Not worked around here; named.**

---

## 11. Security posture — whose guarantee is whose

**I am stating the posture, not implementing it.** Every row's owner is named, and the client column
is deliberately short.

### 11.1 The server's, and only the server's

| Guarantee | Note |
|---|---|
| Password storage | The client never sees a stored form of it. How it is stored is the engineering lead's |
| Breached / common-password rejection | §6.4. Cannot be a client list |
| Code generation | Cryptographically random, 6 digits, unguessable across a challenge's lifetime |
| Code comparison | Timing-safe, and against the current code only |
| Attempt counting and lockout | §5.4. Keyed to the challenge **and** the source, server-side |
| Rate limiting | `auth.signIn`, `auth.verifyCode`, `auth.resendCode`, `auth.requestPasswordReset` — per identifier and per source |
| **Uniform response timing and wording** on `auth.requestPasswordReset` | §6.2. The single guarantee that makes the non-committal confirmation true rather than decorative |
| Token issue, single-use, expiry and invalidation | §6.3 |
| Session issue, idle and absolute expiry, invalidation on reset (§6.5) and on sign-out-everywhere | §7 |
| Permission evaluation | Foundation §11 |
| Audit emission for every event in §12.3 | Written where the mutation succeeds, never before validation (`:2856`–`:2860` states the legacy rule and it is the right one) |

### 11.2 The client's, and none of it is a security control

| The client does | Which is a … |
|---|---|
| Format-check the identifier before submit (§4.5) | Courtesy |
| Show the password policy before typing (§6.4) | Courtesy |
| Render a strength meter | Courtesy |
| Disable the primary while a request is in flight | Correctness |
| Never persist a password or a code anywhere outside the field | Hygiene |
| Label fields so a password manager fills them correctly | Correctness |
| Show a countdown on the resend control | Courtesy — the server enforces the cooldown regardless |
| Disable mutating controls in `session-expired` (§7.3) | Correctness — **the server rejects them anyway, and that is the actual control** |

> **Finding, current behaviour, suspected defect — D-A3.** `changeMaPassword` (`:3036`–`:3045`)
> checks non-empty, length ≥ 8, and match — **in the browser, against nothing** — then clears the
> inputs, calls `logAction('change_password', …)`, and toasts `'✅ Password updated'`. No credential
> is verified and none is stored. The audit log ends up asserting a credential change that did not
> happen; `00c` **F13** records the same thing. The file's own comment at `:2989`–`:2994`
> acknowledges the local-state pattern honestly — the audit row is what makes the fiction durable.
> **This is a finding, not a pattern to reproduce.** No screen in this spec validates a credential
> in the browser and none writes an audit row for a mutation it did not make.

> **Finding — D-A4.** `commitUserSwitch` (`:3098`) has no `requirePerm` and no confirm: any
> operator, including a Support user with three permissions, can become the Owner from the top-bar
> avatar (`:578`), and `logAction` then attributes their actions to the impersonated user
> (`:3138`). Recorded as `00c` **F3** and **F5**. Out of scope here (§2.2) and named because
> **shipping authentication in front of a console that contains a one-click RBAC bypass is
> theatre.** Recorded as a cross-wave blocker in **§16.1 B-1**.

---

## 12. Copy, keys and Arabic

### 12.1 Namespaces

`auth.*` for the six screens and the re-auth modal. `onboarding.*` for the layer, the intro and the
step content. Step titles and bodies are **keys on the fixture row** (`titleKey`, `bodyKey`), never
literals in a component — otherwise 30 steps of training copy end up in TSX and out of reach of a
translator.

### 12.2 Strings that cannot be concatenated, named individually

Foundation §7.5 rule 2 forbids concatenation and interpolated fragments. On these surfaces the
offenders are predictable, so here they are up front, each as **one key with named placeholders**:

| Needed string | Key | Note |
|---|---|---|
| `Try again in 12 minutes` | `auth.lockout.retryIn` `{minutes}` | Needs a plural rule. Arabic has six plural forms — this cannot be `n + ' minutes'` |
| `Resend in 27s` | `auth.otp.resendIn` `{seconds}` | Same |
| `Sent to ••••••67` | `auth.otp.sentTo` `{hint}` | The masked run is a **numeric run**: it does not reorder in RTL and needs bidi isolation (foundation §7.5 rule 6). **The example string is corrected from `••• ••• 4567`, which exposed four digits and broke this spec's own AC-519 — applied from design §15 overrule 2. The criterion binds; the illustration was written against a four-digit habit** |
| `3 of 8 completed` | `onboarding.progress` `{done}` `{total}` | §5.6's required format |
| ~~`Skipped (2)`~~ | withdrawn with AC-632; the key is unused | |
| `Your role changed to Ops Manager` | `onboarding.roleChanged` `{role}` | Role names are themselves keys (`role.opsManager`), not English literals interpolated into Arabic |
| `You hold 3 of 13 permissions` | `onboarding.intro.permissions` `{held}` `{total}` | |
| `Signed out of 4 other sessions` | `auth.reset.otherSessionsEnded` `{count}` | |

### 12.3 Audit events these surfaces emit

Every one needs an `ACTION_LABELS` entry, because 135 of 161 existing action keys have none and are
therefore unreachable from the Activity Log's filter (`00c` **F2**, `:9238`). New keys:
`sign_in`, `sign_in_failed`, `challenge_locked`, `second_factor_enrolled`, `password_reset_requested`,
`password_reset_completed`, `invite_activated`, `device_trusted`, `device_revoked`, `signed_out`,
`signed_out_everywhere`, `onboarding_completed`, `onboarding_dismissed`, `onboarding_reset`.

**`sign_in_failed` records the identifier attempted and the source, never the password and never a
fragment of it.**

### 12.4 The RTL call that will otherwise be got wrong

**The 6-digit code input does not mirror.** The boxes fill left-to-right in Arabic exactly as in
English, because a verification code is a numeric run and foundation §7.5 rule 6 puts numeric runs
in the do-not-reorder set alongside ids, plates and IBANs. The *cell* aligns inline-start; the digits
do not reverse. This is the single most likely RTL defect on this surface and it is flagged here so
the designer decides it deliberately rather than discovering it in a visual-QA pass.

---

## 13. Acceptance criteria

Numbered, independently checkable, each phrased so QA can pass or fail it without asking me.
**AC-500 – AC-681.**

### 13.1 Sign in (AC-500 – AC-517)

- **AC-500** `/signin` renders with no rail, no sub-tab column and no top bar. None of the three is
  present in the DOM.
- **AC-501** An operator who is not authenticated and opens any in-app route is sent to `/signin`,
  and after a successful sign-in lands on **the route they originally asked for**, not on
  `session.landingRoute`.
- **AC-502** An authenticated operator opening `/signin` is sent to `session.landingRoute` without
  rendering the sign-in card.
- **AC-503** The card contains, in this order: wordmark, heading, one-line subtitle, identifier
  field, password field, a `Forgot password?` link, `Remember this device`, a full-width primary,
  and the legal link row. Nothing else. There are **no social-provider buttons** and no
  `Create account` link anywhere on the surface. The legal row renders **only the links Admin ›
  Workspace's `legal` pane actually provides** — `Help` is not among them, Eyvar having no help
  centre — and when the pane provides none the row is absent rather than empty.
  **Source: design §15 overrule 1 (design §1.3, §2.2).** `Forgot password?` moved from below the
  primary to directly beneath the password field: two reference frames put it there
  unambiguously, D14 sends card order to the inherited flow, and it is the control an operator reaches for in
  the second after the primary just failed — below the primary it sits under the fold a banner
  re-render pushes down. The trailing clause about the legal row is mine, added because design
  §1.3 makes the row conditional and *"contains … the legal link row. Nothing else."* would
  otherwise fail a card that correctly omits it.
- **AC-504** Submitting an identifier that is not a plausible email address shows
  `Enter a valid email address.` under that field and does not issue a network request. **The
  string carries a period.** `docs/ref/copy.md`'s exact-wording row omitted it and was wrong: R6
  (*full sentences take a period*) is a ruling and beats `copy.md`, which is a condensation of
  §5.7. **Source: design §3.2 and design §16 F-3** — see §4.5. **`copy.md:33` and its rule 8
  now agree**, so there is one string to check and not two.
- **AC-505** Submitting `sarah@eyvar.com` with the fixture password advances to `/signin/verify`.
- **AC-506** Submitting an unknown identifier, submitting `sarah@eyvar.com` with a wrong password,
  and submitting `suspended@eyvar.com` with any password produce **byte-identical** on-screen copy.
- **AC-507** After any credential rejection, the identifier field still holds what was typed and
  the password field is empty.
- **AC-508** Submitting `noura.f@eyvar.com` (status `Invited`) produces the same copy as AC-506. The
  words "invited", "activate" and "pending" appear nowhere on the screen.
- **AC-509** While a submission is in flight the primary control cannot be triggered a second time
  by click, by `Enter`, or by double-submit, and both fields remain readable.
- **AC-510** The password field has a reveal control; activating it shows the characters and
  activating it again hides them. The control has an accessible name and is keyboard-operable.
- **AC-511** With `?mockFail=auth.signIn`, submitting valid credentials shows a transport error in
  the card with a retry action; the identifier is preserved and the password is cleared.
- **AC-512** With no network, the card states that the console is offline, the primary is disabled
  with the reason named, and nothing typed is cleared.
- **AC-513** `Forgot password?` navigates to `/forgot-password` carrying whatever identifier was
  typed, pre-filled.
- **AC-514** Signing in with the correct credentials on a device that has **not** been remembered
  always reaches `/signin/verify`. There is no configuration, no role and no fixture that skips it.
- **AC-515** An operator whose `secondFactor` is `null` is sent to `/signin/enroll` after the
  credential step, cannot navigate away from it to any in-app route, and receives no session until
  enrolment completes.
- **AC-516** With `?mockFail=auth.enrollSecondFactor`, the enrolment step shows an error with retry
  and the operator is still not signed in.
- **AC-517** No screen in the product offers a control that disables the second factor for an
  account. Searching the built app for such a control returns nothing.

### 13.2 Verification code (AC-518 – AC-537)

- **AC-518** `/signin/verify` accepts exactly 6 numeric characters and rejects letters and symbols
  at input time.
- **AC-519** The masked destination of the code is displayed, and it never shows more than the last
  two digits of a phone number.
- **AC-520** Pasting `123456` fills the whole input, moves focus to the primary, and **does not
  submit**.
- **AC-521** Pasting `123 456` and pasting `123-456` both produce the same filled state as AC-520.
- **AC-522** Entering `123456` and submitting signs the operator in.
- **AC-523** Entering a wrong code shows `That code is incorrect.` and the attempt counter
  increases by one.
- **AC-524** Entering `111111` (superseded) shows the replaced-code message, and a subsequent
  **third** wrong entry — not a second — is what triggers AC-526. A superseded code never increments
  the counter.
- **AC-525** Entering `000000` (expired) shows the expired message, does not increment the counter,
  and enables the resend control immediately regardless of any running cooldown.
- **AC-526** On the third **wrong** attempt the input is cleared, the operator is told to request a
  new code, and the resend control is enabled regardless of cooldown.
- **AC-527** On the fifth **wrong** attempt the operator is returned to `/signin` and a further
  sign-in attempt with the same identifier shows the lockout message.
- **AC-528** The lockout message names a duration in minutes and that duration decreases on
  subsequent attempts within the window.
- **AC-529** `999999` reaches the challenge-locked state directly, for QA, without five submissions.
- **AC-530** After a successful sign-in, re-submitting the same code — by browser back, by replay,
  or in a second tab — does not produce a second session.
- **AC-531** A code issued in one browser context and entered in a different one is rejected.
- **AC-532** Pressing `Resend` disables the control and displays a countdown that reaches zero and
  re-enables it. The first cooldown is longer than zero and the second is longer than the first.
- **AC-533** **Once five codes have been sent for one challenge, the operator is returned to
  `/signin` and told to start again. The count is of codes, including the one sent when the
  challenge opened — so the fifth code is the fourth successful resend, and the next press of
  `Resend` is refused.**
  *(Amended. **This criterion and its own copy counted different nouns.** It said *"after
  5 resends"*; `design/08-auth-and-onboarding.md` §4.4's string says *"Five codes were sent for this
  sign-in."* — **and five resends is six codes.** Both literal readings happen to be satisfied by
  the shipped `MAX_CODES_PER_CHALLENGE = 5`, which is why nothing failed; the engineer flagged it
  anyway, correctly, because **a criterion and a string that count different nouns will be
  re-litigated by whoever reads only one of them.**
  **The noun is `codes`, and the choice is not arbitrary.** An operator can count codes — each one
  arrived on their phone. Nobody can count *resends* without first deciding whether the code that
  opened the challenge was one, which is precisely the ambiguity that produced the off-by-one.
  Counting the thing the operator received also makes the string and the constant name the same
  quantity, so all three now say `codes`.)*
- **AC-534** After a resend, the previous code is rejected as **superseded**, not as wrong
  (AC-524's counter behaviour applies).
- **AC-535** With `?mockFail=auth.verifyCode`, submitting a code shows a transport error with retry;
  the entered digits are preserved and the counter does not increase.
- **AC-536** With `?mockFail=auth.resendCode`, pressing resend shows an error with retry and the
  existing code remains valid.
- **AC-537** In Arabic (`dir="rtl"`), the six digit positions fill in the same order as in English:
  typing `1` then `2` produces a code beginning `12` in both languages.

### 13.3 Forgot password, reset and activation (AC-538 – AC-556)

- **AC-538** `/forgot-password` shows one field, one primary and one route back to `/signin`.
- **AC-539** Submitting a known address and submitting an unknown address produce **byte-identical**
  on-screen copy.
- **AC-540** The confirmation states the link's expiry in words and appears as an in-card banner
  **on the `/signin` card, in its banner slot between the subtitle and the identifier field** —
  not on `/forgot-password`, and not as a toast. Its tone is `info`; there is no success glyph and
  no green. **Source: design §15 overrules 7 and 8 (design §7.1, §7.2).** Overrule 7 is a
  clarification, not a reversal: this spec named the placement within a card and never named the
  card.
- **AC-541** The confirmation copy never contains the words "found", "exists", "no account", or the
  address's account holder's name.
- **AC-542** `/reset-password?token=valid` renders the new-password form.
- **AC-543** `/reset-password` with `token=expired`, `token=used`, `token=superseded` and an unknown
  token all render **the same** invalid-link state, with an action that returns to
  `/forgot-password`.
- **AC-544** `/reset-password` with no `token` parameter renders the invalid-link state, not an
  empty form.
- **AC-545** The password policy — the 12-character minimum — is visible **before** the operator
  types anything.
- **AC-546** A password shorter than 12 characters cannot be submitted, and the reason shown names
  the minimum.
- **AC-547** A mismatch between the two fields is shown under the confirm field, not as a toast, and
  the primary cannot be submitted while it stands.
- **AC-548** A server-rejected password (breached list) renders as an inline error under the field
  after submission, and the fields keep their contents.
- **AC-549** With `?mockFail=auth.requestPasswordReset`, the request shows a transport error with
  retry — a state visibly different from the non-committal confirmation.
- **AC-550** With `?mockFail=auth.validateResetToken`, landing on `/reset-password?token=valid`
  shows an error with retry, **not** the invalid-link state.
- **AC-551** With `?mockFail=auth.resetPassword`, submitting shows an error with retry and the
  entered values are preserved.
- **AC-552** A successful reset states what happened to the account's other sessions. When there
  is at least one, the message **names how many ended**. When there are none, the message says so
  **without a numeral and without the word `0`** — it does not read `0 other sessions ended`.
  Both forms come from one key with one plural rule, never from two keys and never from a
  concatenation. **Corrected by me, not by the designer.** As originally written — *"naming the
  count"* — this criterion cannot pass in the zero case, which design §7.5's explicit ICU `=0`
  form correctly renders without a count. The design is right and the criterion was wrong.
- **AC-553** After a successful reset the operator is required to complete a verification code
  before reaching any in-app route.
- **AC-554** After a successful reset, every previously trusted device requires the second factor at
  its next sign-in.
- **AC-555** `/activate?token=valid` renders the set-password form for an `Invited` account, and on
  success that account's status is `Active` and it can sign in.
- **AC-556** With `?mockFail=auth.activateInvite`, activation shows an error with retry and the
  account's status is still `Invited`.

### 13.4 Session (AC-557 – AC-576)

- **AC-557** With the idle timeout set to its minimum, an operator who does not interact sees the
  warning banner before the session ends, and the banner states the remaining time.
- **AC-558** The warning banner is a banner. It is not a modal, does not block the page, and does
  not have a scrim.
- **AC-559** The warning appearing does not extend the session. Only activating `Stay signed in`
  does, and doing so removes the banner.
- **AC-560** After the absolute lifetime elapses, the session ends **even if the operator has been
  continuously active**, and the reason shown distinguishes it from an idle expiry.
- **AC-561** When the session expires while the active route is **clean**, the operator is sent to
  `/signin` with the reason stated.
- **AC-562** When the session expires while the active route is **dirty**, the operator is **not**
  redirected, the page is not reloaded, and the form's values are all still on screen.
- **AC-563** In that state every mutating control on the page is inert, and the reason is
  available two ways: **stated visibly once on the surface** — the re-authentication modal's own
  heading and body — and **programmatically associated with every inert control**, via
  `aria-describedby` pointing at one reason element. No reason is carried by a `title` attribute
  or by anything else that requires a pointer hover. Text inputs are made `readOnly`, not
  `disabled`, so their content stays readable and selectable (**AC-562**). **Clarified by me
  against design §8.1.** The original wording — *"each carries a reason"* — reads as a demand for
  a visible reason per control, which the design deliberately does not do and should not; QA
  would have failed a correct screen.
- **AC-564** In that state the SaveBar is still visible and reports `dirty`.
- **AC-565** Completing re-authentication returns the operator to the same route, the same
  `?view=`, the same scroll position, with every previously entered value intact and the SaveBar
  still `dirty`.
- **AC-566** Saving immediately after re-authentication succeeds and writes one audit row
  attributed to the operator who typed the form.
- **AC-567** **A second operator cannot be signed in from the re-authentication surface, because
  the surface offers no way to name one.** Checked as three independent tests, all three of which
  must pass:
  - **(a) Inventory, not search.** The complete set of controls inside the re-authentication modal
    is exactly: the account line **rendered as static text** (not an `input`, not editable, not
    focusable), one password field, its reveal control, `Sign out`, and `Sign in`. QA enumerates
    every `<input>`, `<select>`, `<textarea>`, `contenteditable` and focusable element inside the
    dialog and compares that enumeration to this list; **any element not on the list fails**, and
    an `input` of any type other than `password` fails outright.
  - **(b) The request carries no operator-supplied identity.** The `auth.reauthenticate` payload
    contains no identifier, email or user id taken from anything the operator can type, paste or
    put in a URL. QA checks the outbound request on a successful re-authentication.
  - **(c) The identity that comes back is the identity that expired.** After re-authentication the
    session's `userId` equals the `userId` of the session that expired, and the save that follows
    writes **one** audit row naming the operator who typed the form (**AC-566**).

  Throughout all three, the dirty form is untouched. The named path to a different account is
  `Sign out`, which routes through §8.3 of the design spec.

  **Source: design §15 overrule 3 (design §8.2), applied — with the test shape rewritten by me.**
  The designer replaced a *refusal* with an *absent field* and they are right to: a refusal is a
  check that can be forgotten, an absent field cannot be, and `00c` **F5** is what forgetting it
  once costs. But a criterion phrased only as *"the surface has no identifier field"* is not
  testable in the direction that matters — a QA engineer cannot search the space of controls that
  might be added later, and an absence proves nothing about what `auth.reauthenticate` accepts.
  (a) is the testable form of the absence, because a closed inventory can be diffed where an open
  search cannot; (b) and (c) state the guarantee the absence is supposed to deliver, so that it
  survives somebody re-adding the field. See §7.6.
- **AC-568** Explicit `Sign out` while dirty raises the `navigate-away-dirty` modal naming what will
  be lost. Cancelling it leaves the operator signed in and the form dirty.
- **AC-569** `Remember this device` unchecked, then a second sign-in from the same browser, reaches
  `/signin/verify`.
- **AC-570** `Remember this device` checked, then a second sign-in from the same browser, does
  **not** reach `/signin/verify`, and the device appears in the account's device list marked as
  trusted.
- **AC-571** Revoking a trusted device from that list means the next sign-in from it reaches
  `/signin/verify`.
- **AC-572** `Remember this device` never skips the password step. There is no path into the console
  that does not require the password.
- **AC-573** Re-authentication after an idle expiry on a **trusted** device asks for the password
  only; on an untrusted device it asks for the password and a code.
- **AC-574** With `?mockFail=auth.reauthenticate`, re-authentication shows an error with retry, the
  app stays mounted, and the dirty form is intact.
- **AC-575** `Sign out` ends the current session and returns to `/signin`; opening an in-app route
  afterwards does not restore it.
- **AC-576** `Sign out everywhere` states how many sessions will end before it acts, and after it
  acts the device list holds only the current device.

### 13.5 Failure, edge and permission-change states (AC-577 – AC-592)

- **AC-577** `locked@eyvar.com` shows the lockout state on the first attempt, with a duration.
- **AC-578** `suspended@eyvar.com` shows the generic credential rejection and never the word
  "suspended", "disabled" or "deactivated".
- **AC-579** A transport failure at any point in the flow preserves every non-secret value the
  operator has typed.
- **AC-580** No screen in the auth flow renders a spinner with no timeout: every in-flight state
  resolves to success or to a named error state.
- **AC-581** Every error state in §9.1 offers either a retry or a stated next action. None is a dead
  end.
- **AC-582** Going back in the browser from `/signin/verify` to `/signin` and forward again does not
  sign the operator in and does not resurrect a consumed code.
- **AC-583** Two tabs on `/signin/verify` for the same account: completing the challenge in one
  makes the other's code invalid, and the other tab says so rather than hanging.
- **AC-584** An operator whose role is changed while signed in sees the rail, the sub-tab column and
  every count re-derive **without a reload**.
- **AC-585** After that change, a route the new role cannot see renders `route-forbidden` naming the
  permission — not a redirect, not a toast, not a blank screen.
- **AC-586** If the permission authorising a **pending save** is revoked, `Save` becomes disabled
  with the reason named, `Discard` stays enabled, and the form's content stays on screen and
  selectable.
- **AC-587** With `?mockFail=session.refresh`, the permission re-read failing leaves the operator's
  current permissions in force and does not sign them out.
- **AC-588** A permission **gained** mid-session makes the corresponding workspace tile or sub-tab
  row appear without a reload.
- **AC-589** A code that arrives after a newer one was requested is rejected with the
  replaced-code message and does not consume an attempt (this is AC-524 stated as the operator's
  own scenario, and QA checks it by resending then entering the earlier code).
- **AC-590** With `?mockFail=session.current`, the shell renders its error state with the rail and
  the sub-tab column intact and does not send the operator to `/signin`. A failed identity read is
  not a sign-out.
- **AC-591** No password, no verification code, and no reset token appears in `localStorage`,
  `sessionStorage`, a non-secure cookie, or any URL the operator can copy — except the reset and
  invite tokens, which are single-use by design.
- **AC-592** No audit row is written for a credential mutation that did not succeed. Failing to
  change a password writes `sign_in_failed` or nothing, never `password_reset_completed`.

### 13.6 Onboarding — the contract (AC-593 – AC-616)

- **AC-593** An operator activating from an invite reaches their landing route with the onboarding
  layer open.
- **AC-594** The layer opens automatically **exactly once**, on the first session of an account that
  has never had onboarding state. A second sign-in does not auto-open it.
- **AC-595** The layer has no scrim and the workspace behind it is visible and readable while it is
  open.
- **AC-596** Everything behind the layer stays operable: the rail, the sub-tab column and the top
  bar all respond while it is open.
- **AC-597** The layer can be closed with `Escape` and with a visible close control, and closing it
  does not mark anything complete.
- **AC-598** The account menu carries an onboarding entry at all times for every role.
- **AC-599** That entry shows `n / m` while the track is incomplete and not dismissed, and shows no
  count indicator otherwise.
- **AC-600** The layer's first content is the intro: the role name, one sentence of accountability,
  the permission count, and a link to Operations › My Work.
- **AC-601** The permission count in the intro equals the number of permissions the signed-in
  account actually holds. For `lina@eyvar.com` it reads 3.
- **AC-602** The progress line reads `{done} of {total} completed` and is accompanied by a progress
  bar.
- **AC-603** `total` counts only steps that are reachable — built destination and permission held.
- **AC-604** At most one step is expanded at a time. Expanding a second collapses the first.
- **AC-605** Only the expanded step shows its description, its action and its skip control. **No
  step renders a `Learn more` link, in any state**, because `learnMoreKey` is `null` on all 21
  fixture rows and Eyvar has no help centre to link to (§8.2, **Q-82**, design §16 **F-2**). A
  rendered `Learn more` **fails** this criterion until Q-82 is answered. **Corrected by me.** The
  original wording required a link the product has no destination for; §5.6's `Learn more` is a
  SHOULD and it is recorded as unmet rather than left to fail silently.
- **AC-606** Every step can be marked done manually, whether or not it can be auto-detected.
- **AC-607** Every step whose destination is a sub-tab navigates there when its action is activated,
  and closes the layer.
- **AC-608** Every step's destination `subTabId` exists in the route table. QA checks this by
  diffing the fixture against `routeTable.ts`; a step naming an id that is not there fails.
- **AC-609** A step whose destination sub-tab is not yet built renders disabled in place, states
  why, and is excluded from `total`.
- **AC-610** ⚠ **KNOWN-FAILING — blocked on foundation Q4.** A step whose `requiredPermission` the
  operator does not hold renders disabled in place, names the permission and who can grant it, and
  is excluded from `total`.
  **Blocker:** foundation §12.2 **Q4** — *which permission gates each of the 34 sub-tabs* — is
  unanswered, so **every `requiredPermission` in `onboardingTracks.ts` is `null`** and no step can
  enter the forbidden state. **The treatment is fully designed, keyed and copied** (design §10.2,
  §10.3 `step-unreachable-forbidden`); it is unreachable, not unbuilt.
  **QA: report as blocked, never as a regression.** It becomes reachable on the day Q4 lands and
  the fixture's `requiredPermission` values stop being `null` — a data edit, with no design or
  component change. Note that `newrole@eyvar.com` reaches `track-empty` through **zero
  permissions**, not through a forbidden step, so **AC-631 passes while this one cannot** — the
  two are not testing the same path and passing AC-631 does not discharge this one.
  Cross-referenced: §14, design §16 **F-5**.
- **AC-611** No step is hidden. Every step in the operator's track is present in the DOM.
- **AC-612** Completing an auto-detected step by doing the real task in the product — claiming an
  item in Operations › My Work — marks that step done without the operator opening the layer.
- **AC-613** The layer is reachable by keyboard from the account menu, and focus moves into it on
  open and returns to the trigger on close.
- **AC-614** Onboarding never renders inside a work queue's empty state, an index table's empty
  state, or any R8 first-run treatment. QA checks by clearing a queue and confirming only the E1
  sentence appears.
- **AC-615** There is no coach mark, no spotlight, no tooltip tour, and no modal wizard anywhere in
  the onboarding flow.
- **AC-616** Every operator-facing string in the layer resolves through an i18n key. Rendering with
  an empty Arabic dictionary shows English for every one of them and never a raw key.

### 13.7 Onboarding — the per-role tracks (AC-617 – AC-631)

- **AC-617** Four tracks exist, one per role in `TEAM_ROLES`. There is no default or fallback track.
- **AC-618** Steps 1, 2 and 3 are byte-identical across all four tracks, by step `id`.
- **AC-619** An Owner (`sarah@eyvar.com`) sees 3 common steps plus 4 Owner steps.
- **AC-620** The Owner track contains a step whose destination is Admin › Team & Access and whose
  body names that a single account holds `manage_settings`.
- **AC-621** The Owner track contains a step whose destination is Financials › Pricing & Plans and
  whose body states that the pricing model is an outstanding decision.
- **AC-622** A Finance lead (`fahad@eyvar.com`) sees 3 common steps plus 5 Finance steps.
- **AC-623** The Finance track's ledger step body states that a posted row is reversed, never
  edited.
- **AC-624** An Ops Manager (`yousef@eyvar.com`) sees 3 common steps plus 5 Ops Manager steps.
- **AC-625** The Ops Manager track contains a step whose destination is Operations › Requests and
  whose task is to claim, work and dispose of one item.
- **AC-626** The Ops Manager track's Live Dispatch step renders disabled with its reason while that
  sub-tab is unbuilt, and becomes enabled without a fixture change once it exists.
- **AC-627** A Support agent (`lina@eyvar.com`) sees 3 common steps plus 4 Support steps.
- **AC-628** The Support track contains a step stating that safety incidents are visible to Support
  and decided by an Ops Manager, and that step's destination opens Support › Safety & Incidents in a
  read-only state.
- **AC-629** No step in any track has a title or body that could be satisfied by "look at this
  screen": every step names an action the operator performs or a specific fact they must be able to
  state afterwards.
- **AC-630** Checked as two clauses:
  - **(a)** Across all four tracks, **exactly one** step has a workspace `Overview` as its
    destination, and its `id` is **`owner.position`**. Any other step whose destination resolves to
    a `*/overview` route fails. QA checks this as a diff of `onboardingTracks.ts` against the
    route table — an allow-list of one id, not a judgement call.
  - **(b)** No step's destination is the operator's own `session.landingRoute`. `owner.position`
    satisfies this: `financials/overview` is the **Finance** role's landing route and is not the
    Owner's (foundation §3.4 rows 3 and 1).

  **Source: design §15 overrule 4 (design §10.5), applied — with the exception's form tightened by
  me.** The contradiction the designer found is real and it was mine: §8.5 gave Owner step 6 a
  Financials › Overview destination that this criterion banned outright, and foundation §3.4 makes
  `Overview` the first sub-tab of all five workspaces, so the two could not both be right. I chose
  the carve-out over the alternative — banning the destination and moving the two numbers into the
  step body — because step bodies are static i18n fixture strings and cannot carry a live trial
  balance or contribution margin; that fix produces a step with no destination that sends the
  Owner hunting, which is worse than what this criterion was written to prevent. Clause (b) is
  mine: it is the ban this criterion was actually reaching for, all 21 steps already satisfy it,
  and it is what makes the single exception principled rather than arbitrary. The *"explore the
  dashboard"* prohibition itself is enforced by **AC-629**, which `owner.position` passes — it
  names two facts the operator must be able to state afterwards. See §8.5.
- **AC-631** `newrole@eyvar.com` — an Ops Manager holding zero permissions — sees the `track-empty`
  state: one sentence, no illustration, naming who to ask.

### 13.8 Onboarding — lifecycle (AC-632 – AC-648)

- **AC-632** **WITHDRAWN by the owner.** No step offers a Skip control, on any track, in any
  state.
- **AC-633** **WITHDRAWN by the owner**, with AC-632. No `Skipped (n)` group renders anywhere.
- **AC-634** **WITHDRAWN by the owner**, with AC-632. The progress line's numerator counts
  completed steps.
- **AC-635** When every reachable step is done, the list collapses to a done line and reveals
  `Dismiss`.
- **AC-636** `Dismiss` is available at any time, not only at completion.
- **AC-637** After dismissal the layer never auto-opens again and no onboarding banner is ever
  raised again for that track.
- **AC-638** After dismissal the account-menu entry still opens the layer, showing the same
  completion state.
- **AC-639** Onboarding state survives a sign-out and a sign-in on a different browser. QA checks by
  completing two steps, signing out, and signing in from a fresh browser context.
- **AC-640** `Restart onboarding` clears completions for the current track, un-dismisses it, and
  does not touch any other operator's state.
- **AC-641** A `manage_team` holder can reset another operator's onboarding from Admin › Team &
  Access; an operator without `manage_team` has no such control anywhere.
- **AC-642** When an operator's role changes, steps completed under the old track whose `id` also
  appears in the new track stay completed.
- **AC-643** After a role change with at least one incomplete step in the new track, one banner is
  raised naming the new role and offering to open the checklist. The layer does **not** open by
  itself.
- **AC-644** Steps completed under a former role that the new role cannot reach appear in a
  collapsed `Completed under a previous role (n)` group and are excluded from `total`. They are not
  deleted.
- **AC-645** Dismissing the role-change banner does not dismiss the track, and the account-menu
  entry's `n / m` reflects the new track.
- **AC-646** With `?mockFail=onboarding.completeStep`, marking a step done returns it to not-done
  and shows an inline retry in that row — not a toast alone.
- **AC-647** With `?mockFail=onboarding.skipStep` and `?mockFail=onboarding.dismiss`, each shows an
  error with retry and leaves the state unchanged.
- **AC-648** With the same account open in two tabs, completing a step in one and then completing a
  different step in the other results in both being complete; neither overwrites the other.

### 13.9 The four states, on every surface here (AC-649 – AC-657)

- **AC-649** With `?mockFail=onboarding.get`, the layer renders an error state with a retry and the
  console behind it keeps working.
- **AC-650** While `onboarding.get` is in flight the layer shows a skeleton shaped like the step
  list, not a centred spinner.
- **AC-651** While `session.devices` is in flight the device list shows a skeleton, not a spinner.
- **AC-652** With `?mockFail=session.devices`, the device list shows an error with retry inside its
  own card; the rest of the account layer still renders.
- **AC-653** An account with no other sessions shows the one-grey-sentence empty treatment, not a
  first-run illustration.
- **AC-654** Every auth screen's in-flight state is visible for at least one frame with the default
  mock latency: no screen goes from idle to resolved without rendering a loading state.
- **AC-655** Every state named in §9.1 and §9.2 is reachable in the built app by the mechanism
  documented in §10 — a `?mockFail=` id, a fixture identifier, a fixture code, or a fixture token.
  QA checks this by reaching all of them.
- **AC-656** No error message on any of these surfaces contains "please", "invalid", "failed", or
  an exclamation mark.
- **AC-657** No error message blames the operator. Each states the condition and the next action.

### 13.10 Permissions (AC-658 – AC-668)

- **AC-658** The six auth screens require no permission and are reachable while unauthenticated.
- **AC-659** The onboarding layer requires no permission beyond an authenticated session; every role
  can open its own track.
- **AC-660** An operator cannot see, open or modify another operator's onboarding state without
  `manage_team`.
- **AC-661** An operator can always view their own device list; no permission gates it.
- **AC-662** An operator cannot revoke a session belonging to another account without
  `manage_team`.
- **AC-663** ⚠ **KNOWN-FAILING — blocked on Q-78.** The idle-timeout, trusted-device-window and
  enrolment settings are gated, and the screen naming that gate names a permission that **exists
  in the built permission set**.
  **Blocker:** **Q-78** — no `manage_security_policy` key exists under any proposal, and the three
  settings sit inside `manage_settings` today: one key, one holder, 39 of 131 guards (`00c` F27).
  The criterion cannot pass because the permission it requires the screen to name **is not in the
  set to be named**.
  **QA: report as blocked, never as a regression.** It is discharged when the business owner
  answers Q-78 as part of **D4** and the key is added. Nothing has been designed around it: the
  Admin › Team & Access pane carrying those three settings is **wave 7** and is in neither this
  spec's screen list nor the design spec (design §16 **F-4**). Cross-referenced: §14, §16.
- **AC-664** No screen offers a control that turns the second factor off for any account, for any
  role, including Owner.
- **AC-665** A route the operator's role cannot see renders `route-forbidden` after
  re-authentication exactly as it does before it.
- **AC-666** Every permission-denied surface in this spec names the permission required and who can
  grant it.
- **AC-667** No control anywhere in this spec is enabled-then-refused. Every unavailable control is
  disabled at render with its reason available.
- **AC-668** The auth screens emit no `permission_denied` audit rows, because they have no
  permission to deny.

### 13.11 Copy, Arabic and accessibility (AC-669 – AC-681)

- **AC-669** Every operator-facing string on the six auth screens, the two layers and the device
  list resolves through an i18n key.
- **AC-670** No string in this spec's surfaces is built by concatenation. Every interpolation is a
  named placeholder inside a single key.
- **AC-671** Each key in §12.2 exists and renders with its placeholders substituted; a missing
  placeholder throws rather than rendering `{count}` to an operator.
- **AC-672** No emoji appears in any operator-facing string on these surfaces.
- **AC-673** Every screen renders correctly at `dir="rtl"` with `lang="ar"`: the card mirrors, the
  fields mirror, and the layout does not overflow at 1280 px.
- **AC-674** The verification-code input fills in the same visual order in Arabic and in English
  (AC-537, checked as a visual criterion here).
- **AC-675** The masked delivery hint's numeric run is not reordered in Arabic.
- **AC-676** Every interactive element on these surfaces has a visible focus indicator.
- **AC-677** Every screen is completable using only the keyboard, including the reveal controls, the
  resend control and the step actions.
- **AC-678** Every error is announced to assistive technology when it appears, not only rendered.
- **AC-679** The code input, the password fields and the identifier field each have a programmatic
  label and the correct autocomplete semantics, so a password manager fills them.
- **AC-680** All copy is sentence case; every button label is a verb or verb + object.
- **AC-681** The onboarding progress renders as `{done} of {total} completed` in both languages,
  with the numerals localised and the phrase not reassembled from fragments.

---

## 14. Permissions

Cross-reference: `docs/01-modules/00c-identity-permissions-and-audit.md`.

| Surface | Rule |
|---|---|
| The six auth screens | **No permission.** They are the thing that produces one |
| Second-factor enrolment | The operator's own account only. No role may enrol on behalf of another |
| Own device list, own trusted devices, own sign-out-everywhere | Every authenticated operator, own record only. This mirrors §11.2's "My profile layer" rule |
| Another operator's sessions or trusted devices | `manage_team`. There is no narrower key and inventing one is D4's business |
| Re-issuing an invite, resetting an account's onboarding | `manage_team` (`:10530` already guards `commitInvite` with it) |
| The onboarding layer, own track | Every authenticated operator |
| Another operator's onboarding state | `manage_team` |
| Idle timeout · trusted-device window · enrolment policy | Today: `manage_settings` — one key, one holder, 39 of 131 guards (`00c` F27). **Q-78** proposes `manage_security_policy`. Until then **AC-663 is known-failing** — blocker named there and in §16 |
| Each onboarding **step's destination** | The permission that gates the destination sub-tab — **which is foundation Q4, unanswered for all 34.** Every `requiredPermission` in the fixture is therefore `null` today, and §8.7's disabled-in-place path is unreachable until Q4 lands. **AC-610 is known-failing** — blocker named there and in §16. Named, not papered over |

---

## 15. Findings — current behaviour, suspected defects

Numbered `D-A*` to avoid colliding with `docs/ref/defects.md` D1–D24 and foundation's `D-L*`.

| # | Current behaviour | Why it looks wrong | Evidence |
|---|---|---|---|
| **D-A1** | Password minimum is 8, checked in the browser | The check runs against a form that stores nothing; 12 is a floor for a check that does not exist yet, not a correction of a working one | `:3040` |
| **D-A2** | `defaultPermissionsForRole` returns `[]` when a role has no current holder | The **first** person invited into a role gets zero permissions and an empty console. Also `00c` F15/F16 | `:10522`–`:10528` |
| **D-A3** | `changeMaPassword` validates in the browser, stores nothing, and writes a `change_password` audit row plus a success toast | The audit log asserts a credential change that did not occur. The comment at `:2989` is honest about the local-state pattern; the audit row makes the fiction durable. Also `00c` F13 | `:3036`–`:3045` |
| **D-A4** | `commitUserSwitch` has no permission guard | Any operator can become the Owner from the top-bar avatar, and actions are then attributed to the impersonated user. Also `00c` F3, F5 | `:3098`, `:578`, `:3138` |
| **D-A5** | `twoFA` and `require2FA` are declared and never enforced | Two settings, one per-user and one per-workspace, whose only effect is a badge. Turning the policy on renders `⚠ 2FA off` next to three of five operators and changes nothing | `:2572`, `:2831`, `:3023`, `:8028`, `:10456` |
| **D-A6** | `toggleMa2FA` mutates `u.twoFA` without re-rendering | The label at `:3022` disagrees with the toggle for the rest of the page visit. Also `00c` F14. Moot under §4.2, which removes the toggle — recorded so the removal is not mistaken for the fix | `:3047`–`:3053` |
| **D-A7** | No code path moves a team user from `Invited` to `Active` | An invited operator can never arrive. `commitUserSwitch` refuses them (`:3103`) and the modal greys them (`:3094`) — the product knows the state and has no exit from it | `:10538`; grep for `status='Active'` on `teamUsers` returns nothing |
| **D-A8** | `sessionTimeoutMin: 30` is stored, clamped and saved | There is no session to time out. The number is real; the thing it governs is not | `:2572`, `:8027` |
| **D-A9** | `logOutSession` confirms with a native `confirm()` and splices the array | A native dialog is not a §5.3 surface, has no styling, no Arabic and no focus management | `:3059`–`:3066` |
| **D-A10** | The device list shows a raw IP address to every operator | It is the operator's **own** list, so it is defensible — recorded because it is PII on a screen nobody reviewed for it, and because `view_profiles` is enforced nowhere (`00c` F9) | `:3018` |

---

## 16. Open questions

Continuing the project's numbering. `Q-1..Q-63` are taken by foundation and wave 2; `Q-77` onward
is this spec.

| # | Question | Who answers | Blocked until answered |
|---|---|---|---|
| **Q-77** | **WebAuthn / passkeys instead of, or alongside, SMS and TOTP?** A strictly stronger second factor, and it needs a device-registration surface that does not exist. Deferred deliberately (§2.2), not overlooked | Business owner, with the engineering lead | Nothing today. The `secondFactor.method` union (§10.1) is written so adding `'passkey'` is a type edit |
| **Q-78** | **Which permission gates the security policy?** Idle timeout, trusted-device window and enrolment policy sit inside `manage_settings` today — one key, one holder (`00c` F27). `PROPOSED-STRUCTURE.md` §10.5 proposes three replacement keys and none of them is obviously this one. Proposed: **`manage_security_policy`** | Business owner, as part of **D4** | **AC-663**, which fails visibly until then |
| **Q-79** | **Who receives the security notification on a lockout?** The account itself, always. Also the Owner? A `manage_team` holder? Notifying the Owner on every mistyped code is noise; notifying nobody means a credential-stuffing run against the roster is invisible | Business owner, with whoever owns identity | Nothing blocks; §12.3 emits the audit event either way. The *notification* recipient list is what is open |
| **Q-80** | **Does the invite email carry a role, and is it re-assignable before activation?** `commitInvite` fixes the role at invite time (`:10538`); nothing lets a `manage_team` holder change it before the person arrives | Business owner | Nothing in this spec. It changes Admin › Team & Access, wave 7 |
| **Q-81** | **Is `Suspended` reversible, and by whom?** `TeamUserStatus` declares it; no code path sets it or clears it. A suspended operator is indistinguishable from a wrong password at sign-in (AC-578, correctly) — which means somebody must be able to see and undo it from Admin | Business owner | Wave 7. §9.1's `credentials-rejected` is correct either way |
| **D4** *(DECISIONS.md; = foundation Q3)* | **The role model** | Business owner | §8.6 names exactly which criteria move under each outcome. **Nothing here is blocked** — four tracks ship against the four roles that exist |
| **Q1** *(foundation §12.2)* | **What persists across a reload** | Engineering lead | **Nothing in this spec.** §8.4 states why onboarding is deliberately server-backed and what it would use Q1 for if it landed: one nicety, which degrades cleanly |
| **Q4** *(foundation §12.2)* | **Which permission gates each of the 34 sub-tabs** | Business owner | Every onboarding step's `requiredPermission` is `null` until it lands, so §8.7's forbidden-step path is unreachable. **AC-610** cannot pass until then |
| **Q7** *(foundation §12.2)* | **Which of the four pricing models is real** | Finance lead | Owner step 7's *content*, not its existence. The step ships saying the decision is outstanding |
| **Q-82** | **Where does `Learn more` go?** `DESIGN.md` §5.6 SHOULDs a `Learn more` link on every guide task and `copy.md` rule 11 gives its exact form. **Eyvar has no help centre, so there is no destination.** All 21 steps ship `learnMoreKey: null` and the layer renders nothing rather than a dead link (§8.2, design §14 **A-7**, §16 **F-2**). This is a **content gap**: somebody has to commission 21 help articles and a place to host them. It is recorded here so the unmet SHOULD is a decision on the record rather than a silent omission | Business owner, with whoever owns product content | **Nothing.** `learnMoreKey` is already nullable (§8.9) and **AC-605** is written so that a rendered link *fails* until this is answered. When it is answered, it is a fixture edit plus 21 strings — no design and no component change |

### 16.1 Cross-wave blockers

Things this spec depends on, or is undermined by, that belong to another wave and are **not**
solvable inside it. Distinct from §16's questions: a question needs an answer, a blocker needs a
piece of work by somebody else.

| # | Blocker | Where it lives | Why it is named here |
|---|---|---|---|
| **B-1** | **`commitUserSwitch` has no permission check and no confirmation, and `logAction` then attributes actions to the impersonated user.** `commitUserSwitch` at **`eyvar_ops_panel_v40_fixed.html:3098`** reaches no `requirePerm` and raises no confirm, so any operator — including a Support user holding three permissions — can become the Owner from the top-bar avatar (`:578`). `logAction` at **`eyvar_ops_panel_v40_fixed.html:3138`** then reads the already-reassigned `CURRENT_USER_ID` and writes the audit row under the impersonated identity. Recorded independently as `00c` **F3** and **F5**, and here as **D-A4** (§15) | **Wave 7** — impersonation is a separate spec (§2.2). Owner: whoever specs Admin › Team & Access | **Shipping authentication in front of a one-click RBAC bypass is theatre.** Every guarantee in §11.1 — attempt counting, session issue, permission evaluation, audit emission — is evaluated against `CURRENT_USER_ID`, and `:3098` lets any operator choose what that is. §8.2 of the design spec removes the identifier field from the re-authentication surface **specifically to stop this same misattribution arriving through a new door** (§7.6, **AC-567**); leaving the old door open makes the new lock decorative. This spec does not fix it and must not be read as having fixed it. **Two things must land in wave 7: a `manage_team` guard on `:3098` with an explicit confirmation, and an actor/on-behalf-of split in `logAction` at `:3138` so an impersonated action records both identities** |

---

## 17. One thing the owner asked for that carries a real risk — built anyway

**Per-role step-by-step onboarding is the fastest-rotting artifact this product will contain, and I
am specifying it in full rather than trimming it.** Four tracks of five to eight steps is roughly
thirty pieces of training copy, each naming a sub-tab, a view and a task. Two of those destinations
are not built yet (wave 5 and wave 6), the wave-2 and wave-3 specs are three days old and already
carry open questions that change what a step should say (Q7 is inside an Owner step; Q-51 is inside
a Support step), and D1 merged seven pages once already — every merge, rename or view change
silently invalidates a step that will keep pointing confidently at the wrong place. Onboarding that
lies is worse than no onboarding, because a new employee has no way to tell. The mitigations are in
the spec rather than in this paragraph: steps are **fixture rows keyed to a `subTabId` from the
route table**, so a rename is one data edit and a missing destination is a build-time diff
(**AC-608**); a step whose destination is unbuilt or forbidden **renders disabled in place with the
reason named** rather than as a dead link (**AC-609**, **AC-610**); and no step is written as a
tour of a screen, so a step survives a layout change and only breaks when the *task* changes
(**AC-629**). It still needs an owner who re-reads it when a sub-tab moves. Naming that now is
cheaper than discovering it when a new Finance lead follows step 5 into a screen that no longer
does what it says.

---

## 18. Handoff

**Artifact:** this file. **AC-500 – AC-681**, contiguous. No criterion has been renumbered on any
pass, and none sits outside 500–681.

**Reconciliation pass.** `design/08-auth-and-onboarding.md` §15's nine overrules have
been applied — see **§19** for what was applied as written, what was reshaped and why, and what
was not an overrule at all. The design spec and this spec no longer contradict each other, and
**§19.3 lists five further contradictions found on this pass that §15 did not name.**

### To product-designer

1. ~~**F-1 and F-2 block design of every screen in §4.1.**~~ **Closed.** R4-2 minted the auth-card
   row and the fifth page shape and the guided-checklist row; R4-3 ruled the layer count at four
   and re-authentication a modal. §4.1 is corrected. **What is still yours: §19.3's five
   contradictions** — **C-3 needs an edit in your file, not just awareness**: design §7.5 asserts
   *“**AC-552** ✓ names the count”*, and that assertion is false for the `=0` form your own ICU
   string introduces. The design is right and the claim about it is wrong, which is the worse of
   the two. **C-2 is closed on both sides** — `copy.md:33` and rule 8 carry the period. Also §16 **Q-82**
   (`Learn more` has no destination — now a recorded content gap, not a SHOULD left to fail).
2. **Confirm or overturn D14** in your spec, and write the §2.5 D split from §3.4 into it — which
   clauses are structure (kept) and which are inherited visual (replaced from `--ev-*`).
3. **Final copy for every state in §9.1 and §9.2** — 24 auth states and 11 onboarding states.
   Especially: the one generic credential-rejection sentence (used by three different causes), the
   non-committal reset confirmation, and the three code outcomes in §5.3, whose distinctions only
   work if the copy makes them.
4. **The verification-code input**, including the RTL fill-order call in §12.4. Take the position
   explicitly; do not leave it to the implementation.
5. **The onboarding layer against §5.6's anatomy** under D7 visuals — progress line, one-open-at-a-
   time accordion, the skipped group, the archived group, the done state.
6. **The idle-warning banner's tone**, and how it coexists with an already-present banner under
   §5.2's merge rule.
7. **The `session-expired-dirty` surface** (§7.3) — an authentication card over a mounted,
   disabled console with a SaveBar still up. This is the hardest surface in the spec and it has no
   reference in either screenshot set.

### To mock-data-engineer

1. **Two new clients** (`auth.ts`, `onboarding.ts`) and **20 operation ids**, §10.2. Every one
   registered so `?mockFail=` reaches it.
2. **Domain outcomes are fixtures, not injected failures** — §10.3. Three new identities
   (`locked@`, `suspended@`, `newrole@`), five fixture codes, five fixture tokens.
3. **`TeamUser.twoFactorEnabled` → `secondFactor`** (§10.1), and a real `Invited → Active`
   transition.
4. **`onboardingTracks.ts`** — four tracks, structured so D4 is a data edit (§8.6). Every
   `destination.subTabId` must exist in `routeTable.ts`; **AC-608** is a diff against it.
5. **Requested:** `?mockFail=auth.signIn:429` status syntax, §10.4.
6. **Requested, and it is yours to make:** `routeTable.ts` gains the `overlay` value
   **`onboarding` and nothing else** (R4-3). **`reauth` is not a layer and must not be added** —
   corrected from this spec's original F-2 request; re-authentication is a modal with no route and
   no URL param (§4.1 row 7).
7. **`learnMoreKey: null` on all 21 rows** and **`requiredPermission: null` on all 21 rows**, and
   both are deliberate: Q-82 and Q4 respectively (§16). Neither is a fixture to be filled in by
   guessing.

### To frontend-engineer / shell owner

1. **§7.3 is the expensive one and I want your response, not your compliance.** The sign-in form
   must exist at two mount points, and the dirty-form guarantee is the reason. If it is too
   expensive, say so — the answer is not to drop the guarantee.
2. **F-2 touches `src/shell/`**: **one** new layer (`onboarding`), `ShellContext` gains a session
   lifecycle and the freeze contract, and foundation §4.3 goes from three layers to **four**, one
   open at a time. **Re-authentication is a modal, not a layer** (R4-3), and **entering
   `session-expired` closes every open shell layer first**, because a modal may not composite over
   a drawer. Corrected from this spec's original "five layers" request. Requested, not written by
   me.
3. **`DataTable`'s empty-kind request from wave 2 (§4.7 F-3) also bites here** — AC-653's device
   list must render the grey-sentence empty, not first-run.

### To main

Spec written: `docs/05-restructure/specs/04-auth-and-onboarding.md`, AC-500–AC-681, covering six
auth screens, **one shell layer and one modal** (R4-3), four onboarding tracks and 37 named states. **D14 proposed** —
The auth spec governs structure and flow, D7's token layer keeps the visual language; the owner confirms or
reverses.

**Blocked and named:** ~~F-1/F-2~~ **closed** by R4-2 and R4-3 · **Q-78** — **AC-663 is
known-failing**, blocker named in the criterion · **Q4** — **AC-610 is known-failing**, blocker
named in the criterion. Neither is a regression and QA must not report them as one. · **Q-82**
(`Learn more` has no destination) does not block; **AC-605** is written so a rendered link fails.
**D4 does not block** — four tracks ship against the four roles that exist and §8.6 names what
moves. **Q1 does not block** — onboarding is deliberately server-backed and §8.4 says why.

**Cross-wave blocker, new:** **§16.1 B-1** — `commitUserSwitch` (`:3098`) has no permission check
and no confirmation, and `logAction` (`:3138`) then attributes actions to the impersonated user.
Out of scope here by §2.2, **wave 7**, and named because shipping this authentication in front of
a one-click RBAC bypass makes the lock decorative.

---

## 19. Reconciliation with the design spec — the nine, and what they cost

`design/08-auth-and-onboarding.md` §15 records nine overrules of this spec. I have checked each
against my own text rather than absorbing it, because **a spec that silently accepts every overrule
has stopped being a spec.** All nine are applied in substance. Two are applied with a different
shape, and two are not overrules at all. Nothing was refused.

### 19.1 Disposition of the nine

| § | Clause | Disposition | Where it now lives |
|---:|---|---|---|
| **1** | **AC-503** — `Forgot password?` moves above the primary | **Applied as written.** Card order is structure under D14, two reference frames put the link there unambiguously, and the product argument — it is the control an operator reaches for the second after the primary failed — is stronger than the reference one. This is layout, which is the designer's to decide and not mine | **AC-503**, plus a clause of mine on the conditional legal row (§19.3 **C-1**) |
| **2** | **§12.2**'s `Sent to ••• ••• 4567` → `Sent to ••••••67` | **Applied as written.** My illustrative string exposed four digits and violated **AC-519**, which is my own criterion. The criterion binds; the illustration was wrong | §12.2 |
| **3** | **AC-567** — refusal replaced by an absent identifier field | **Applied in substance, rewritten in shape.** §19.2 | **AC-567**, §7.6 |
| **4** | **AC-630** — a carve-out for `owner.position` | **Applied in substance, tightened in form.** §19.2 | **AC-630**, §8.5 |
| **5** | **§4.1 row 7** — `reauthenticate` is a modal, not a fifth layer | **Applied as written**, and it was already binding: **R4-3** ruled it before the design spec was written and named this file as the edit site. §7.3.3's focus law forces it — a no-scrim layer does not trap, so `Tab` would walk the operator out of the only working control into the frozen console behind it. §7.3's guarantee is untouched: R4-3 is about which overlay renders, not about the mount tree | §4.1 row 7 + note · §4.1 F-2 · §7.3 rule 2 · §7.6 · §9.1 · §12.1 · §18 |
| **6** | **§9.1** — add `challenge-missing` and `challenge-completed-elsewhere` | **Applied as written, and the omission was mine.** I wrote **AC-530**, **AC-531**, **AC-582** and **AC-583** and then gave none of them a named state to be designed against. *Count the states* is my rule and I broke it | §9.1 |
| **7** | **AC-540** — the confirmation lands on the `/signin` card | **Applied as written, and the designer's own label is right: a clarification.** This spec named a placement *within* a card and never named the card. Closing an ambiguity is not reversing a position | **AC-540**, §6.2 |
| **8** | **§6.2** — the confirmation's tone is `info`, not `success` | **Applied, and it is not an overrule.** §19.2 | **AC-540**, §6.2 |
| **9** | **§5.2** — focus moves on paste only, never on typing | **Applied, and it is not an overrule.** §19.2 | §5.2 |

### 19.2 The four that need more than a table row

**Overrule 3 — AC-567, and whether an absence is testable.**

The mechanism is right and I have applied it. A refusal is a check, a check is a line of code, and a
line of code can be deleted by someone who does not know why it is there; an absent field cannot be
forgotten into existence. `00c` **F5** is the price of forgetting once, and the refused case has no
legitimate user — nobody has ever needed to become a second operator inside a first operator's
unsaved form. Prevention over refusal, agreed.

**But the criterion as they wrote it is not testable, and the problem is structural rather than a
matter of wording.** *"The re-authentication surface has no identifier field"* asks a QA engineer to
prove a negative over an open set: they cannot enumerate every control that might one day be added
and confirm that none of them is an identifier. And the assertion is about the **surface** while the
risk is about the **operation** — an absent field says nothing about whether `auth.reauthenticate`
would accept an identity if one were supplied, so the criterion goes green on a build where the
guarantee has already been lost behind the field's absence.

**An absence criterion needs a closed inventory plus the invariant the absence is supposed to
deliver.** That is how **AC-567** is now written: **(a)** the surface's complete control list,
diffable, where any element not on the list fails; **(b)** the request carries no operator-supplied
identity; **(c)** the session that comes back carries the `userId` of the session that expired, and
the save that follows is attributed to the operator who typed the form. (a) is the testable form of
*no identifier field*, because a closed inventory can be diffed where an open search cannot. (b) and
(c) survive somebody re-adding the field.

**Overrule 4 — AC-630, and the two available fixes.**

**The contradiction is real and it is mine.** I read my own §8.5: Owner step 6, destination
`Financials › Overview`. Foundation §3.4 makes `Overview` the first sub-tab of every one of the five
workspaces, so that destination **is** a workspace Overview, and AC-630 banned it outright. The
criterion and the step could not both be right.

**I chose the carve-out over ban-and-move, and the reason is that ban-and-move is not actually
available.** Step bodies are static i18n fixture strings (`bodyKey`, §8.9). A body cannot carry a
live trial balance or a live contribution margin; it can carry only their names. Banning the
destination therefore does not move the two numbers into the body — it deletes them, and leaves the
Owner a step that says *"there are two numbers you should know"* with no destination, manual
completion only, and a hunt. That is a worse step than the one AC-630 exists to prevent. Putting
live money figures into a translation dictionary would breach §12.2's own rule besides.

**The carve-out's form was weak, and I have changed it.** An exception written as prose invites a
second one. AC-630 is now a **closed allow-list of exactly one step id**, diffable against the
fixture, plus a clause this spec should have carried from the start: **no step's destination is the
operator's own `session.landingRoute`.** That is the ban AC-630 was reaching for — sending an
operator to the screen they land on every morning teaches nothing. All 21 steps already satisfy it,
so it creates no design work, and it is what makes the single exception principled rather than
arbitrary: `financials/overview` **is** the Finance role's landing route and **is not** the Owner's,
which is exactly why the step is worth an Owner's morning and would be worth nothing to a Finance
lead. The *"explore the dashboard"* prohibition is carried by **AC-629** either way, and
`owner.position` passes it — it names two facts the operator must be able to state afterwards.

**Clauses 8 and 9 are not overrules, and saying so is not a quibble.**

- **Clause 8** overrules §6.2's tone. §6.2 already read: *"under D14 that placement is structure, so
  it is kept **while its colour is not**."* I ceded tone in the very sentence being overruled. The
  designer made the call I asked them to make, and made it correctly.
- **Clause 9** narrows §5.2's *"moves focus to the submit control"* to paste only. §5.2's sentence
  begins *"Pasting a 6-digit string…"* and describes nothing else; it was **silent** on typing the
  sixth digit, not wrong about it. That silence was a gap in my spec and the designer filled it
  correctly. A gap filled is not a position reversed.

Neither reclassification changes what gets built. Both change what the count of overrules means —
and the count is what a reader uses to judge whether these two documents were written by people who
agreed.

### 19.3 Contradictions §15 did not name — found on this pass

The design spec was read for what to overrule. This is the other search: what quietly disagrees.
**Five.** All five are corrected on this side. **One still needs an edit in the designer's file:**
**C-3** — design §7.5 asserts *“**AC-552** ✓ names the count”*, which is false for the `=0` form
that same section introduces. **A right design carrying a wrong claim about itself is the worse
defect**, because the claim is what the next reader checks instead of the design. **C-2 closed on
both sides while this pass was running** — the designer corrected `copy.md` in the same pass that
produced the ruling I was reading, so my first read of it predated the edit by minutes. Verified
in the file rather than relayed.

| # | Contradiction | Status |
|---|---|---|
| **C-1** | **AC-503 vs design §1.3 — the legal row is conditional.** AC-503 said the card *"contains … the legal link row. Nothing else."* Design §1.3 renders only the links Admin › Workspace's `legal` pane provides and, **when it provides none, does not render the row at all**. A correct card with an empty `legal` pane fails AC-503 as it was written | **Corrected by me** in AC-503. No design change needed |
| **C-2** | **AC-504 vs design §3.2 — one string, two spellings.** AC-504 quoted `docs/ref/copy.md`'s `Enter a valid email address` with no period; the design spec's final string is `Enter a valid email address.` **with** one, because R6 beats `copy.md` (design §16 **F-3**). The designer found the `copy.md` conflict and did **not** notice that my criterion quotes the periodless form — so a byte-checking QA engineer fails a correct screen | **CLOSED ON BOTH SIDES.** Corrected by me in AC-504 and §4.5; and the designer corrected `copy.md` in the same pass — **`docs/ref/copy.md:33`** now carries the period, and **rule 8 at `:19`** gained *“An inline field error is a sentence and takes one”*. **Verified in the file, not relayed.** All three sources spell the string identically |
| **C-3** | **AC-552 vs design §7.5 — the zero case.** AC-552 required the reset confirmation to name *"the count"* of ended sessions. Design §7.5 correctly gives `auth.reset.done` an explicit ICU **`=0`** form that names **no** count, because `0 other sessions ended` is not a sentence anyone should ship. Design §7.5 asserts *"**AC-552** ✓ names the count"*, which holds only for `{count} ≥ 1`. The design is right; my criterion was wrong | **Corrected by me** in AC-552. No design change needed |
| **C-4** | **AC-563 vs design §8.1 — where the reason lives.** AC-563 required every frozen mutating control to *"carry a reason available without a pointer hover"*, which reads as a demand for a **visible** reason on each control. The design provides one visually-hidden `<p>` referenced by `aria-describedby` from every frozen control, plus the modal's own visible heading and body — the right answer, and one that fails the criterion read literally | **Clarified by me** in AC-563. No design change needed |
| **C-5** | **AC-605 vs design §10.2 — a link that never renders.** AC-605 required the expanded step to show *"its `Learn more` link"*; design §10.2, §14 **A-7** and §16 **F-2** render none, on any step, ever. §16 **F-2** raises the SHOULD as a content gap but does not name AC-605 as the criterion it breaks | **Corrected by me** in AC-605, which now **fails** if a link is rendered, and recorded as **Q-82** (§16). No design change needed |

**One thing checked and found consistent, recorded because it reads like a contradiction and is
not.** **AC-624** says an Ops Manager *"sees 3 common steps plus 5 Ops Manager steps"* — eight —
while **AC-603** and **AC-609** exclude the unbuilt `ops.dispatch` step from `total`, so the progress
line reads out of **seven**. The two measure different things: AC-624 counts steps **present in the
DOM** (**AC-611**: no step is hidden), AC-603 counts steps **reachable**. Both are right, and a QA
engineer who conflates them will file a defect against a correct screen. Named here so they do not.

### 19.4 What was deliberately not touched

**No acceptance criterion has been renumbered, on this pass or any other.** Auth occupies
**AC-500 – AC-681** and every criterion in this file is inside that range — checked, not assumed.
The known collision elsewhere in the project (wave 2 claims 200–344, wave 3 claims 300–450, so
**300–344 is double-allocated**) does not reach this spec and is not mine to resolve; two build
agents are working against those numbers now, and renumbering under them would be the most
expensive kind of tidying.
