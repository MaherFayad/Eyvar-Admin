# 21 — The refusal grammar, the permission name set, and the five warm moments

**Owner:** ux-writer · **Status:** the copy-value half is applied; the new-key half is a
spec for the i18n-arabic-engineer and the product-designer.
**Reads against:**
`DESIGN.md` §5.7 and §9.6, `docs/ref/copy.md`, `12-refusal-and-undo-surfaces.md`,
`20-arabic-glossary.md`.

This document is the hand-off. Everything under **Applied** is already in the tree as a
copy value. Everything under **Specified** needs a key that does not exist yet, or a
component edit, and is not this owner's to make.

---

## 1. The refusal grammar

`12-refusal-and-undo-surfaces.md` §2 ratified D17's two-sentence capability grammar and
found it surface-independent. It was **obeyed in one place out of twenty-three.** The tree
carried four competing grammars:

| Grammar | Sites | What it fails to say |
|---|---|---|
| `You cannot X. Ask an administrator for the manage-tickets permission.` | 10 | the permission is a hyphenated machine key; *administrator* is not a role in this product |
| `You need the Subscriptions permission to X.` | 6 | who grants it |
| `Your role cannot X.` | 30 | the permission **and** who grants it |
| `Needs the approve_drivers permission` | 1 | a raw identifier on screen; not second person; no granter |

### 1.1 The one grammar

> **`You cannot {verb the object}. Ask an {granter role} for the “{permission name}” permission.`**

Three clauses and it stops. **What was refused** — the act, in the operator's words, second
person, never the record. **Why** — the named permission. **What to do instead** — ask a
named person, because the operator who lacks a permission usually also lacks `view_admin`
and cannot walk to Admin › Team & Access themselves. Naming the route to somebody who
cannot reach it is not an instruction.

Variants, and only these three:

| Case | Form |
|---|---|
| A read-only surface, not one dead control | `You can read every {noun} and change none. Ask an Owner for the “{permission name}” permission.` |
| A refusal over a set (D21's `.other` / `.all`) | The count clause replaces clause 1: `{count} of the selected payouts cannot be paid. Ask an Owner for the “Captain payouts” permission.` |
| A whole-page forbidden route | `This page needs the “{permission}” permission. An Owner can grant it in Admin › Team & Access.` — the route survives here, because a forbidden **page** is reached by an operator who is looking at the console and may hold `view_admin` |

**The granter is `an Owner` everywhere.** `manage_team` — the only permission that grants
permissions — is Owner-held, so there is exactly one true answer and no site may invent a
second. `Owner` is a role proper noun (`role.owner`) and keeps its capital.

**What the grammar must never do.** No warmth, no softening, no `You may want to`, no
apology, and never `you do not have permission` alone. A refusal is read by someone who has
just been stopped; the respectful move is to be exact and brief.

### 1.2 Applied — 41 values rewritten

| File | Keys |
|---|---|
| `src/screens/operations/people/copy.ts` | `people.action.noPermission` |
| `src/screens/operations/assurance/copy.ts` | `assurance.action.noPermission` |
| `src/screens/operations/subscriptions/copy.ts` | `subs.action.noPermission` |
| `src/screens/operations/requests/copy.ts` | `requests.action.noPermission` |
| `src/screens/operations/trips/copy.ts` | `trips.action.noPermission` |
| `src/screens/operations/corporate/copy.ts` | `corp.action.noPermission`, `corp.action.noPermission.create` |
| `src/screens/queues/copy.ts` | `queue.action.noPermission` |
| `src/screens/management/zones/copy.ts` | `zones.blocked.permission` |
| `src/screens/admin/team/copy.ts` | `admin.team.refusal.noPermission` |
| `src/screens/admin/workspace/copy.ts` | `admin.workspace.legal.refusal.noPermission`, `admin.workspace.readOnly`, `admin.integrations.readOnly` |
| `src/screens/admin/communications/copy.ts` | `comms.resend.no.permission`, `comms.identity.blocked.permission`, `comms.editor.readOnly`, `comms.push.blocked` |
| `src/screens/admin/data/copy.ts` | `adminData.integrity.blocked.permission`, `adminData.retention.blocked`, `adminData.export.omitted` |
| `src/screens/admin/policy/copy.ts` | `policy.blocked.permission` |
| `src/screens/admin/activity/copy.ts` | `admin.activity.bulk.export.refused.{one,other,all}` |
| `src/screens/financials/copy.ts` | `fin.payout.blocked.permission` + the 15 `fin.bulk.{pay,release,apply,waive,claim}.permission.*` |
| `src/screens/support/tickets/copy.ts` | 4 `*.blocked.permission` |
| `src/screens/support/disputes/copy.ts` | 5 `*.blocked.permission` |
| `src/commands/copy.ts` | `ticket.action.reopen.blocked.permission` |
| `src/screens/support/conversations/copy.ts` | `conversations.composer.noPermission` |
| `src/i18n/dictionaries.ts` | `state.forbidden.body` |
| `src/screens/onboarding/copy.ts` | `onboarding.step.forbidden` |

---

## 2. The permission name set — 21 names, English and Arabic

**The problem.** `account.permission.<key>` holds a **capability sentence**
(`Dispatch trips and act on live requests`) and there is no **name**. A capability sentence
cannot be quoted inside `the “…” permission` without reading as a paste, and the alternative
— quoting the raw key — is the defect `18` §3.2 raised. `conversations.composer.permission`
already invented a short name (`Contact users`) for exactly this reason and is the only
site with one.

**The fix.** A `perm.<key>.name` family — a short noun phrase, sentence case, one per
permission key. The capability sentence stays exactly where it is and keeps its key; the
name is a second, shorter thing, and both render on Admin › Team & Access so the operator
who was told to ask for `“Captain payouts”` can find that row.

**These names are used verbatim in the refusal copy already applied.** If a name changes,
the refusals change with it — that coupling is the point, and it is why the name set is one
list and not twenty-one local decisions.

| Permission key | `perm.<key>.name` (en) | `perm.<key>.name` (ar) |
|---|---|---|
| `view_analytics` | Management access | الوصول إلى الإدارة |
| `view_operations` | Operations access | الوصول إلى العمليات |
| `view_finance` | Financials access | الوصول إلى الماليات |
| `view_support` | Support access | الوصول إلى الدعم |
| `view_admin` | Admin access | الوصول إلى المسؤول |
| `view_profiles` | Profile access | الوصول إلى الملفات الشخصية |
| `approve_drivers` | Captain applications | طلبات الكباتن |
| `manage_subscriptions` | Subscription control | التحكم في الاشتراكات |
| `live_ops` | Live dispatch | التوزيع المباشر |
| `manage_plans` | Plans and pricing | الباقات والتسعير |
| `process_payouts` | Captain payouts | مستحقات الكباتن |
| `release_escrow` | Escrow release | الإفراج عن الضمان |
| `apply_deductions` | Captain deductions | خصومات الكباتن |
| `manage_tickets` | Ticket handling | معالجة التذاكر |
| `contact_users` | Contact users | مراسلة المستخدمين |
| `manage_team` | Team administration | إدارة الفريق |
| `manage_ops_policy` | Operational policy | السياسة التشغيلية |
| `manage_workspace` | Workspace settings | إعدادات مساحة العمل |
| `manage_data_governance` | Data governance | حوكمة البيانات |
| `manage_security_policy` | Security policy | سياسة الأمان |
| `manage_settings` | Legacy settings | الإعدادات القديمة |

Notes for the translator, per `20-arabic-glossary.md`:

- Every name is a **noun phrase**, so R6's masdar ruling does not bite — these are not
  buttons. `الإفراج عن الضمان` and `مراسلة المستخدمين` are masdar forms used nominally,
  which is correct.
- `التوزيع المباشر` is already the glossary's term for **dispatch (the screen)**; the same
  words are correct here because the permission is named after the screen.
- `مستحقات` (payout) and `خصم` (deduction) are the glossary's §3.4 terms, unchanged.
- `صلاحية` is the glossary's word for **permission** and belongs in the refusal template,
  not in the name.

### 2.1 The refusal template in Arabic

```
'refusal.permission': 'لا يمكنك {act}. اطلب صلاحية «{permission}» من المالك.'
```

Three flags for whoever keys it. **(a)** `«…»` are the Arabic quotation marks; they live in
the template so a translator can change them, never in JSX. **(b)** `{permission}` resolves
through `perm.<key>.name`, never through the raw key and never through the capability
sentence. **(c)** The terminal period is the last character of the source string (R2) — it
must not sit before a trailing interpolation. **(d)** `{act}` is a **per-site key**, not a
free parameter: an Arabic verbal sentence agrees with its object, so one template with a
generic `{act}` is ungrammatical for half the acts (R7's gender refinement). One key per
refusal site is the shape that already ships.

---

## 3. The five warm moments

§5.7 is all prohibitions. Perfect compliance yields copy that is correct and cold, and for
money-moving software that is mostly the right trade — but the law is silent on warmth, and
silence is not a ban. Five moments where warmth costs nothing and breaks no rule.

**Where it is forbidden, and this is not negotiable.** Never in error copy — an error is
read by someone whose day just went wrong, and personality there reads as the product not
taking the failure seriously. Never in money: no figure gets an adjective. Never in a
confirmation: a destructive confirm states the object and the consequence and stops. No
mascot, no joke, no first-person-plural apology.

### 3.1 First-run empty states — say what the operator will be able to do

§5.7 already requires the heading to state the section's **value**. Nine whole-page
first-run states reported a null instead. Applied:

| Key | Was | Is |
|---|---|---|
| `trips.empty.firstRun.heading` | No trips yet | Every journey taken, and what it earned |
| `subs.empty.firstRun.heading` | No subscriptions yet | Standing journeys, and the captain committed to each one |
| `fin.empty.firstRun.heading` | No money has moved here yet | This account, posting by posting |
| `overview.empty.heading` | Nothing to report yet | Captains, riders, trips and subscriptions, on one board |
| `corp.empty.heading` | No corporate accounts registered | Company ride budgets, on one invoice |
| `zones.empty.heading` | No zone is tracked | Where demand and supply meet, district by district |
| `admin.team.empty.heading` | No operators yet | Everyone who can sign in, and what each may do |
| `admin.activity.empty.heading` | Nothing has happened yet | The record of who did what, and when |
| `policy.reasons.empty.heading` | No reason code is defined | One word for each way work ends |

**Deliberately not changed:** every `*.empty.heading` inside a **card or section**
(`fin.refund.*`, `fin.creditNote.*`, the four `comms.*` cards, `admin.workspace.empty`).
R8 gives a card empty one grey sentence and no value proposition; reporting the null is
correct there, and selling the section inside a card is the failure R8 was written against.

### 3.2 A genuinely finished queue is an outcome, not a null

`emptyKind: 'cleared'` already models the distinction and most of the copy already matched
it (`Nothing at risk`, `Every request has a captain or an answer.`, `Every cash report for
this period has been decided.`). One did not:

`myWork.empty.cleared.everything` — `Nothing is open in any queue.` → **`Every queue is clear.`**

Same fact. One says a count is zero; the other says the work is done.

### 3.3 The completion moment

`onboarding.done` rendered as **`Done`** — one word, in the success ink, beside a tick, at
the end of a seven- or eight-step track. → **`Every step is done`**. `onboarding.doneBody`
is unchanged and already right. No confetti, no exclamation mark, still §5.7-compliant, and
it is the cheapest warmth available in any product.

### 3.4 A long job completing — lead with the outcome

`adminData.integrity.runSummary.clean` read as a log line: *`Run {run} read {records}
records across {checks} checks. Every check passed.`* → **`Every check passed. Run {run}
read {records} records across {checks} checks.`** The same words. The operator who has
waited for a scan wants the verdict in the first three words, not the run id.

### 3.5 The refusal — §1 above

The hardest surface and the one most worth the time. Warmth here is **not** softening; it
is telling somebody exactly what to do next instead of leaving them at a grey button.

---

## 4. Specified — needs a key or a component change

Copy values were the only territory here. These are not.

### 4.1 Raw machine identifiers still reach the screen

| Site | What an operator reads | Fix |
|---|---|---|
| `src/screens/RouteStates.tsx:118` and `DispatchScreen.tsx:417` | `This page needs the “live_ops” permission.` | pass `t(\`perm.${permission}.name\`)`, not the raw key |
| `src/screens/onboarding/copy.ts:89` | `One account holds manage_settings…` | §10.5 verbatim, and the step is *about* that key. Leave; recorded so it is not "fixed" as a regression |

### 4.2 A refusal rendered as a tooltip — D17 clause 3, §8.4.4 and §5.7 all forbid it

Five sites pass the refusal to a `title` attribute:

```
ApplicationsView.tsx:597, :606      title={deps.canWrite ? undefined : t('people.action.noPermission')}
AssuranceScreen.tsx:833, :846, :1241  title={... : t('queue.action.noPermission')}
ZonesMapView.tsx:926                 title={... : t('zones.blocked.permission')}
```

`ZonesMapView.test.tsx:200` **asserts** the tooltip, so the test moves with the fix. The
refusal must be real text beside the dead control, `aria-describedby`-linked — which is what
`rowActions.tsx` already does and what these five bypass.

### 4.3 One generic key, three different verbs — a live latent collision

`action.saving` is called from three modals for three different acts:

```
CorporateDetailScreen.tsx:357   busy ? t('action.saving') : t('action.savePolicy')
ManualDispatchModal.tsx:241     busy ? t('action.saving') : t('dispatch.confirmAssign')
ChangeDriverModal.tsx:269       busy ? t('action.saving') : t('sub.confirmChange')
```

Three dictionaries declare it with three values — `Saving…`, `Assigning`, `Reassigning…`.
Only `SUBSCRIPTIONS_EN` is in `EN` today, so nothing is wrong on screen **yet**; the day
`DISPATCH_EN` and `CORPORATE_EN` are spread into `EN`, the last spread wins and two of the
three buttons say the wrong verb. The per-screen keys already exist (`sub.reassigning`,
`corp.action.linking`). **Point each call site at its own key and delete `action.saving`
from all three files.** Same defect, same shape, in `action.goBack`
(`Back to applications` / `Back to corporate accounts`) and `sub.selectDriver`
(`New captain` / `Select an available captain`) — all three block the dictionary
registration `DISPATCH_EN` and `CORPORATE_EN` are waiting on.

### 4.4 Toasts and titles that do not name their object

| Site | Now | Should be | Blocker |
|---|---|---|---|
| `fin.payout.toast.paid` | `Payout sent` | `Payout sent to {captain}` | the call site passes no params |
| `applicant.reject.title` | `Reject this application?` | `Reject {name}?` — `people.reject.title` already is | the call site passes no params |
| `ApplicantDetailScreen.tsx:555` | `{t('applicant.bankStatus')}:` | the colon belongs in the key (AC-75) | JSX concatenation |

### 4.5 Sub-tab labels are the last Title Case in the product

Eight navigation labels are Title Case: `My Work`, `Corporate Accounts`,
`Cash & Captain Debt`, `Rider Wallets`, `Ledger & Payment Controls`, `Contact Centre`,
`Operational Policy`, `Activity Log`. §5.7 observes that tabs are sentence case in all 68
reference screens; the counter-argument is that these are destination **names**, treated as
proper nouns, quoted verbatim in onboarding bodies, notice actions and search results.

**Not changed here.** It is one product-wide naming decision, not eight typos, and it is
worth ~30 assertions across the suite. **Raised for the product-owner**: sentence-case them
all, or record in `DECISIONS.md` that a sub-tab name is a proper noun and stop counting them
as findings.

### 4.6 The escrow and deduction refusals name the payouts permission

`PayoutsScreen.tsx:183, :194` derive `fin.bulk.release.permission` and
`fin.bulk.apply.permission` from `fin.payout.blocked.permission`, so all three refusals name
`“Captain payouts”`. That is **true today** — the gate is the payouts sub-tab's single
`writePermission: 'process_payouts'`. But `release_escrow` and `apply_deductions` are their
own keys in `permissions.ts:238–239`, and the day either gates independently the refusal
names the wrong permission. The names for both are in §2 and ready.

### 4.7 Two long jobs have no completion line at all

`rb.canvas.loading` (`Running the report`) and `rb.export` (`Export CSV`) end in silence.
The integrity run is the model — §3.4. Two keys, and they are not this owner's to mint.
