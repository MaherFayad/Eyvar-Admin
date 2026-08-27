# 03 — Authentication and onboarding: six cards, one modal, one layer, one device list

> **Owner:** frontend-engineer. **Consumers:** qa-engineer, visual-qa-engineer,
> mock-data-engineer, product-designer, product-owner, utilities-engineer.
>
> **Design spec implemented:** `docs/05-restructure/design/08-auth-and-onboarding.md` §2–§13.
> **Spec:** `docs/05-restructure/specs/04-auth-and-onboarding.md`, **AC-500 – AC-681**.
> **CARRIED items honoured:** all eleven in `DECISIONS.md` — *"CARRIED — items owed to the
> AUTH BUILD"*.
> **Nothing committed.** Working tree only.

---

## 1. Verification, first, because it is the part that gets skipped

```
$ npx tsc -b --noEmit
(no output)                                                            exit 0

$ npx vite build
✓ built in 7.66s                                                       exit 0

$ npx vitest run
Test Files  57 passed (57)
     Tests  1665 passed (1665)
```

| Point | Files | Tests | `tsc` |
|---|---:|---:|---|
| Before the auth build | 49 | 1348 passing, **1 failing** | 1 error |
| Auth build, first pass | 53 | 1536 passing | clean |
| Seam closed by mock-data | 53 | 1555 passing | clean |
| **This pass** | **57** | **1665 passing** | **clean** |

The two failures at the very start were mock-data-engineer's and they closed
both. **No existing test has been edited or deleted at any point.**

`/token-audit` over `src/components/auth`, `src/screens/auth`,
`src/screens/onboarding`, `src/shell`, `src/hooks/useOnline.ts` and
`src/routes.tsx`: **clean**. No palette class, no raw colour, no physical
direction utility, no `outline-none` without a ring, no `<div onClick>`. Two
allowed hits, both named in §6.

---

## 2. What was built

| Surface | Files |
|---|---|
| The auth card and its vocabulary | `src/components/auth/AuthCard.tsx`, `AuthFields.tsx`, `AuthBanner.tsx`, `OtpField.tsx`, `StrengthMeter.tsx`, `IsolatedValue.tsx`, `AuthWordmark.tsx`, `authContract.ts` |
| The one credential form, mounted twice | `src/components/auth/AuthCredentialForm.tsx` |
| The re-authentication modal, **three bodies** | `src/components/auth/ReauthModal.tsx` |
| The TOTP QR and its encoder | `src/components/auth/TotpPanel.tsx`, `qrMatrix.ts` |
| The device list | `src/components/auth/DeviceList.tsx` |
| Six screens | `src/screens/auth/{SignInScreen,VerifyScreen,EnrollScreen,ForgotPasswordScreen,NewPasswordCard}.tsx`, `index.tsx`, `flowState.ts`, `legal.ts`, `copy.ts` |
| The onboarding layer | `src/screens/onboarding/{OnboardingLayer,OnboardingStepRow}.tsx`, `copy.ts`, `index.ts` |
| The session lifecycle, the freeze, the sign-out guard | `src/shell/session.ts`, `SignOutDirtyDialog.tsx`, `ShellContext.tsx`, `AppLayout.tsx`, `SaveBar.tsx`, `AccountMenu.tsx`, `TopBar.tsx`, `layers/AccountLayer.tsx`, `routeState.ts` |
| Promoted to the shared layer | `src/hooks/useOnline.ts` |
| Routes | `src/routes.tsx` — six auth routes as **siblings** of `AppLayout`, plus `RequireSession` |

**No `shadcn add` was run**, and no runtime dependency was added.

---

## 3. The five most expensive things, and where each one lives

1. **`readOnly`, never `disabled`.** `AuthTextField`, `AuthPasswordField` and
   `OtpField` have **no `disabled` prop at all** — the type is the enforcement.
   Asserted for the in-flight sign-in, the cancelled-code field, and the frozen
   re-auth field.
2. **One `<AuthCredentialForm>`, `mode` prop, two mount points.**
3. **One OTP input, `dir="ltr"`, centred** — now mounted in **two** containers,
   the verify card and the re-auth modal's code body, with one paste rule.
4. **`onCloseAutoFocus` prevented** on the re-auth `AlertDialog`.
5. **`route.overlay` gained `onboarding` and not `reauth`.**

---

## 4. Two known-failing criteria, left failing

**AC-663** — no `manage_security_policy` key exists (**Q-78**, part of D4).

**AC-610** — every `requiredPermission` is `null` until the 34 sub-tab
permissions land (foundation **Q4**). The forbidden treatment is built, keyed
and copied, and is unreachable rather than unbuilt. `onboarding.test.tsx`
asserts all 21 rows are `null`, so the day Q4 lands the assertion fails and
names itself. **AC-631 passes through a different path** and does not discharge
it.

---

## 5. Closed this pass, and what is left

**Ten seam gaps closed by mock-data-engineer, and the three surfaces they
unblocked are built:**

| Was deferred | Now |
|---|---|
| **AC-573** — the code step in the re-auth modal | **Built.** A third body in the same modal: the §4 field, a full-width `Resend code` above the footer, `Sign out` still in it. Reuses `verifyCode` / `resendCode` rather than a second pair of operations |
| §5.1's **TOTP QR** | **Built.** `TotpPanel` + `qrMatrix.ts` — a dependency-free encoder so the square is `currentColor` and not a baked hex |
| §7.4's **`{role}` subtitle** | **Built.** `{role}` resolves through `ROLE_KEYS`, never an English literal interpolated into Arabic |
| **AC-526 / AC-534** | **True now.** The mapping is by `reason`, not by arithmetic on a count, and the third wrong attempt genuinely cancels the code — asserted by submitting the *correct* code afterwards and watching it be refused |
| **AC-533** | **Built**, on the verify card: the resend is **replaced** by `Go to sign in`, plus §4.4's `{count} resends left` line at ≤ 2 |
| **AC-548** | **Built.** An inline error under field 1, both fields kept, refused while the meter says *strong* |
| **AC-506** | All four causes exercised |

**Built this pass from my own report, not from the seam:**

| | |
|---|---|
| **AC-568** | **Built.** `SignOutDirtyDialog` — sign-out-while-dirty names the entity and what will not change; cancelling leaves the operator signed in and dirty. **Scoped to the sign-out only.** 00-shell §11.6 row 10's *general* navigate-away interception still has zero call sites and still needs a router blocker; this reuses its copy so the two cannot drift |
| `useOnline` | **Promoted** to `src/hooks/`, exported from the barrel, three consumers |

**Still deferred, blocker named:**

| Criterion | Blocker |
|---|---|
| **AC-557** | The idle timeout is a parameter with no Admin › Team & Access setting to drive it — wave 7 |
| **AC-586** | Built end-to-end (banner, disabled `Save` with its reason, still-enabled `Discard`); **nothing produces the revocation** |
| **AC-593**, **AC-594** | No signal distinguishes *"never had onboarding state"* from *"has blank state"* — `getOnboarding` creates it on first read. Needs one field: `autoOpenedAt`, or `startedAt: null` until first *sight* |
| **AC-641**, **AC-643**, **AC-660**, **AC-662** | Admin › Team & Access, wave 7 — no surface to hang them on |
| **AC-673**, **AC-677**, **AC-680**, **AC-681** | Visual QA and an Arabic dictionary. The mechanics are asserted; the rendering is not |
| §5.1's `Use {phone} from your profile` | `TeamUser.phone` for an operator who has **no session yet** (AC-515). Needs an `enrolmentToken`-scoped profile read |
| §9's `2 days ago` | No relative-time helper in `src/lib` |

---

## 6. Deliberate additions, each named

**One new token slot**, added in this change, with one consumer:

```css
--tone-warning-graphic: var(--ev-amber);   /* @theme → --color-warning-graphic */
```

`--ev-amber` existed in the ramp with **no `@theme` exposure**, so a component could only
reach it through an arbitrary value. Its one consumer is the password strength meter's
50 % bar, which design §7.3 specifies as `--ev-amber` while its caption is `--ev-amber-dk`.
**R17 is untouched** — same warning tone, exposed at its graphic weight, not a sixth tone.

**One additive prop on a shared component:** `Banner` gained `role?: 'alert' | 'status'`,
defaulted to `alert` so no existing call site moves. **AC-678** needs both, and
`alert.tsx` hard-codes one.

**The two token-audit hits that are allowed:** `transition-[width]` (a property
name, not a value — `ui/progress.tsx` sets the precedent) and one
`style={{ inlineSize }}` on the onboarding progress fill, which is a computed
percentage and uses the **logical** property.

**A QR encoder, written rather than installed.** `qrMatrix.ts` — byte mode,
level M, versions 1–6, ~106 bytes, dependency-free. Every registry package emits
a `<canvas>` or an SVG with baked hex, so adopting one would mean a dependency
*and* post-processing to get back to `currentColor`. It is verified by
**properties, not by a remembered fixture**: the bit stream round-trips, the
format information satisfies its BCH(15,5) check, the function patterns land
where the specification puts them, and — decisively — **every block's
Reed–Solomon syndromes are zero**, which is the *definition* of a correct
codeword rather than a sample of one. **What that does not prove is that a phone
reads it**; that is a scanner check and it belongs to visual QA. The failure
mode is benign meanwhile: QR carries its own error correction, so a wrong stream
fails to decode rather than decoding to a *different* URI, and §5.1 ships the
manual secret beside the square.

**A defect I found in my own tests, and fixed.** `vi.spyOn` on a client
namespace **does not intercept the `@/data/clients` barrel's live binding unless
the spy is given an implementation**. A positive assertion then fails loudly —
which is how it was found. A **negative** one passes *vacuously*. Three of mine
were in that state, including **AC-504**'s *"issues no network request"*, which
is precisely the shape of a false tick. Every spy now carries an implementation,
and the reason is written at the top of both test files.

---

## 7. Two producers that did not exist, now wired

**`ShellConditions.offline` had never been set by anything.** 00-shell §11.6 row 20's
banner and its copy shipped with the shell; the flag was wired to a `setConditions` call no
code makes, so the state was reachable only from a test that set it itself.
`src/shell/useOnline.ts` is the missing producer, read once at the provider and fed to the
shell banner, the auth cards and the re-auth modal. **It belongs in `src/hooks/` and is
requested for promotion** — that directory has a single owner and this build does not own it.

**The session had no lifetime.** `sessionTimeoutMin: 30` was stored, clamped and saved with
nothing to time out (**D-A8**). `src/shell/session.ts` gives it two `setTimeout`s at the two
deadlines and a 1 s tick **only inside the two-minute warning** — so **AC-28** (*none at
boot*) still holds, verified by the existing test.
