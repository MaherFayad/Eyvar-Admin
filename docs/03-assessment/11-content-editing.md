# 11 — Content editing

**Owner:** product-designer · **Status:** assessment, read-only. No production code was changed.
**Questions asked, verbatim:**
> *"does the editing of content show me a preview of how it's gonna be presented for the user"*
> *"does editng of content give me enough flexibility to get the best results"*

**Ran:** `npx vite --port 5319` (boots, HTTP 200, Vite 6.4.3) · `npx vitest run --maxWorkers=4`
(3 076 pass / 7 fail across 123 files — **none of the seven touch a content surface**; the four
content test files, 87 tests, all pass. The failures are `commands`, `i18n/inventory`,
`workspace/integrations`, `corporate`, `trips` ×2, `disputes`, `tickets`.)

---

## Verdict up front

**Question 1 — preview: no, with exactly one exception.**

The product has **one** preview of authored content anywhere:
`TemplateEditorDialog.tsx:210–240`, the transactional-email editor. It is a genuinely good one —
it resolves `{{riderName}}` against the variable's declared sample, it renders an Arabic template
RTL inside an English console, and it leaves an *undeclared* reference visible on purpose so the
defect shows in the preview instead of in a customer's inbox. That is the right instinct, executed.

Every other authoring surface has **none**. Not a weak preview — none:

- The **push composer** has four inputs and no preview panel at all. `PushComposerModal.tsx`
  is 237 lines and the word "preview" does not appear in it.
- The **notification-template card** (SMS / WhatsApp / push) prints the template's raw source to
  the operator, placeholders unresolved, in a monospace box: `MessagingTemplatesCard.tsx:103`
  renders `Captain {driver_name} has accepted your trip ({vehicle_model} · {plate}).` verbatim.
  **That is the failure the owner's question exists to catch, and it is on screen today.**
- The **conversation composer** and the **ticket reply** send into a thread; the thread is the only
  rendering, and it is after the fact.
- The **plan editor** has a card headed *Preview* (`fin.planEditor.preview.heading`). It previews
  the *pricing arithmetic*, not the subscription card a rider reads. The plan name and the six
  feature lines an Arabic rider sees on that card are typed into plain inputs with nothing beside
  them.

**Question 2 — flexibility: the ceiling is low, and it is low in the same place on every surface.**

Nothing in this product can be **drafted, scheduled, test-sent, versioned, or rolled back**. Those
five words return zero non-comment matches across `src/`. An operator gets one shot, live, with no
rehearsal and no way back. `PushComposerModal` sends to **28 460 devices** on one click of one
button with no preview, no draft, no schedule, no recall, and no audit row.

**But:** where the product *withholds* flexibility it is usually right, and deliberately so — a
reason code's machine key is excluded from `SaveReasonCodeInput` by type, money is halalas and
`formatMoney` everywhere, and the pricing half of the plan editor is disabled behind an open
question rather than half-wired. Section 8 lists those, plus the one place the discipline leaked.

**One thing to get out of the way, because it will otherwise distort every row below.**
`src/i18n/dictionaries.ts:925` is `export const AR: Dictionary = {}`. Per
[`docs/ref/i18n.md`](../ref/i18n.md) that is deliberate and **not a content-editing finding** — it
governs the console's own chrome, not what operators author. Operator-authored content is
per-locale *data*, never a dictionary key (`types/policy.ts:252–256` and `types/email.ts:33–37`
both say so explicitly), and four of the six editable surfaces below are genuinely bilingual by
construction. The Arabic problems in this report are about **direction, typeface and segmentation**,
not translation.

---

## 1. The inventory — everything an operator authors

"Content" scored strictly: does a rider or a captain, outside this console, eventually read these
characters? An internal note an operator writes for another operator is **not** content, and is
marked ○ below and excluded from the judgement.

| # | What | Where | Reaches | Editable? |
|---|---|---|---|:-:|
| 1 | Email template subject + body, per key **per locale** | `TemplateEditorDialog.tsx:170–200` | rider / captain inbox | ✔ |
| 2 | Email template variable **declarations** | same dialog, `:114` | — (governs #1) | ✔ partial |
| 3 | Email template variable **sample values** | `types/email.ts:145–155` | — (governs the preview) | **✘ fixture only** |
| 4 | Sender identity display name / address / reply-to | `SenderIdentitiesCard.tsx` | the From header | **✘ no create, no edit** |
| 5 | Push broadcast title + body + deep link | `PushComposerModal.tsx:170–195` | up to 28 460 devices | ✔ |
| 6 | Notification templates — SMS / WhatsApp / push | `MessagingTemplatesCard.tsx` | rider / captain phone | **✘ read-only card** |
| 7 | Conversation reply to a rider or captain | `MessageComposer.tsx:274` | chat / email | ✔ |
| 8 | Ticket reply | `TicketDetailScreen.tsx:391` | the ticket's channel | ✔ |
| 9 | Plan name, EN + AR | `PlanEditorScreen.tsx:337,342` | subscription card | ✔ |
| 10 | Plan feature lines, EN + AR | `PlanEditorScreen.tsx:444–495` | subscription card | ✔ edit only |
| 11 | Reason-code labels, EN + AR | `ReasonCodesCard.tsx:493–517` | disposition pickers; app-facing status unconfirmed | ✔ |
| 12 | Operating city names, EN + AR | `OperationalCards.tsx:290–320` | city pickers | ✔ add + edit |
| 13 | Zone names | `types/zone.ts:128` | dispatch, captain steering | **✘ no editor, EN only** |
| 14 | Steering offer to captains | `ZonesScreen.tsx:185–200` | captain push | **✘ amount only, no text** |
| 15 | ○ Dispute resolution note | `ResolveDisputeModal.tsx:302` | internal record | ✔ |
| 16 | ○ Call log notes | `LogCallModal.tsx` | internal record | ✔ |
| 17 | ○ Saved report / alert-rule names | `SaveReportDialog.tsx:140`, `AlertRuleDialog.tsx:282` | other operators | ✔ |
| 18 | ○ Operator onboarding track copy | `types/onboarding.ts:111` (`titleKey`, `bodyKey`) | operators, via i18n keys | **✘ by design** |

**#18 is on the owner's list and does not belong there.** Onboarding tracks are *operator*
onboarding, their strings are translation keys, and no operator authors them. Correct as built —
but note `learnMoreKey` is `null` on all 21 steps (Q-82, an unassigned content-owner question),
so §5.6's "learn more" affordance is unfilled and deliberately renders nothing rather than a dead
link.

**#14 deserves its own line.** Opening a steering offer pushes a message to captains in a starved
zone. The operator chooses a bonus amount and a zone. **They author no text and see no text.** The
message the captain reads is generated somewhere the console cannot show. That is a push to real
humans with no preview because there is nothing to preview — a scope gap, not a UI gap, and it goes
to product-owner.

---

## 2. The preview table — the direct answer to question 1

Scored on the owner's four criteria. **Faithful** means the operator reads what the recipient will
read. **Styled box** means the text is repeated in a bordered container with no substitution and no
rendering fidelity. **None** means no preview surface exists.

| # | Surface | Preview | Placeholders resolved? | Arabic shown correctly? | Length / truncation warned? |
|---|---|---|---|---|---|
| 1 | Email template | **Faithful (text)** — `TemplateEditorDialog.tsx:210` | **Yes**, against declared samples (`emails.ts:233`) | **Yes** — `dir` from `template.locale` | **No** — no counter on subject or body |
| 3 | Variable samples | n/a | — | AR templates carry AR samples (`fixtures/emails.ts:196`) | — |
| 4 | Sender identity | **None** — nothing to edit | — | — | — |
| 5 | Push broadcast | **None** | **n/a — no variable syntax exists**, so no personalisation is possible at all | **No** — one string, no locale, no `dir` on either field | **No** |
| 6 | Notification templates | **Styled box showing raw source** — `MessagingTemplatesCard.tsx:103` | **No.** `{driver_name}`, `{plate}`, `{amount}` render verbatim | **No** — no locale field on the type | **No** — SMS segment length never mentioned |
| 7 | Conversation reply | **None** (the thread, post-send) | n/a | **No `dir="auto"`** on field or bubble | **No** |
| 8 | Ticket reply | **None** | n/a | **No `dir`** | **No** |
| 9–10 | Plan name + features | **None of the rider card.** The *Preview* card previews pricing arithmetic | n/a | **Yes** — `dir="rtl"` on both AR fields | **Partial** — 60-char counter on AR name and both feature halves; **absent on the EN name** |
| 11 | Reason-code labels | **None** — no view of the picker the label lands in | n/a | **Yes** — `dir="rtl" lang="ar"` on the AR input | No limit exists |
| 12 | City names | **None** | n/a | **Yes** — `dir="rtl" lang="ar"` | No limit exists |
| 13 | Zone names | **None** | n/a | **No AR field at all** | — |

### 2.1 The one good preview, and its four remaining gaps

`renderEmailPreview` (`clients/emails.ts:233–258`) is the right design. It is a pure function; the
editor calls it on every keystroke and `previewEmailTemplate` calls the *same* function across the
seam, so the two cannot disagree. It substitutes declared samples and **leaves an undeclared
reference verbatim** — `emails.ts:172–179` argues that case correctly: silently substituting an
empty string is the bug nobody sees until a customer does. `communications.test.tsx` covers it
(AC-C4, AC-C5).

Four things it still does not do.

**(a) It is text, not an email.** No From line, no sender display name, no subject-line truncation,
no device frame. The operator cannot see that the subject they wrote will be cut in a mail client's
list view, and cannot see which sender identity the mail will carry — even though the card that
owns sender identities is on the same page. Shopify's campaign review
(`06-marketing/marketing-email-campaign-schedule-send-modal.webp`) puts **To / Subject / From** in a
details card *above* a Desktop/Mobile-tabbed rendering of the actual mail. That is the shape this
panel is one step away from.

**(b) `Declare {variable}` poisons its own preview.** `TemplateEditorDialog.tsx:112–116`:

```ts
: [...current, { name, required: true, sample: name }],
```

An operator who types `{{promoCode}}`, sees the save blocked, and presses the offered `Declare
promoCode` fix now has a template whose preview reads **"Your code is promoCode"**. The variable is
declared, the error clears, the save goes through — and the preview is lying in exactly the way the
preview was built to prevent. **There is no UI anywhere to edit a sample**: `variables` renders as
read-only `StatusBadge`s at `:200–208`, and the only real samples in the product were hand-written
into `fixtures/emails.ts`. This is the single highest-value defect in the report: the mechanism is
built, correct, tested, and one field short of complete.

**(c) The source and the preview disagree about direction and typeface.** The body textarea is
`TemplateEditorDialog.tsx:189–196`:

```
className="font-mono text-xs"      // no dir attribute
```

The preview beside it is `dir={preview?.dir}` in `--font-sans` (Inter → Noto Naskh Arabic,
`globals.css:1879`). So an Arabic template is **authored** left-to-right in `ui-monospace`, which
has no Arabic coverage on most machines, and **previewed** right-to-left in Naskh. Same string, two
renderings, side by side. An Arabic-writing operator is editing in the worse one.

**(d) No counter.** `ui/textarea.tsx`'s own header documents the pattern — *"a character counter,
where a hard limit exists, is right-aligned INSIDE the field as `0/40`. Compose it with
`InputGroup`"* — and **no authoring surface in the product uses it.** The only `maxLength` attributes
anywhere are on two internal report-name fields (`SaveReportDialog.tsx:140`,
`AlertRuleDialog.tsx:282`).

### 2.2 The notification-template card is the answer to question 1, in one screenshot

`MessagingTemplatesCard.tsx:100–105` renders `template.sampleText` into a bordered monospace box.
The four seeded rows (`fixtures/emails.ts:725–759`) read, on screen, today:

| Code | Channel | Audience | What the operator sees |
|---|---|---|---|
| `driver_assigned` | push | rider | `Captain {driver_name} has accepted your trip ({vehicle_model} · {plate}).` |
| `subscription_reminder` | whatsapp | rider | `Your monthly package {plan_name} renews on {date}. Unused trips: {trips_left}.` |
| `payout_processed` | sms | captain | `Your weekly payout of SAR {amount} has been transferred to your IBAN {iban}.` |
| `sos_alert` | sms | both | `Emergency trigger on trip {trip_id}. Ops safety desk has been alerted.` |

This is a **styled box that merely repeats the source** — the exact thing the owner named. It is
also, by volume, the most-delivered content in the product: a captain-assigned push fires on every
trip. Three further facts compound it:

1. **It cannot be edited.** There is no dialog, no button, no `saveMessagingTemplate` in
   `clients/emails.ts`. The card's own header (`:8–12`) is candid that it exists to replace a
   module literal with a seam read — it was never given an editor.
2. **It has no locale.** `MessagingTemplate` (`types/email.ts:390–405`) carries no `locale` field,
   and the type comment says so deliberately. So the SMS an Arabic captain receives about their
   payout — and **the SOS broadcast** — is one string in one language. 92 % of seeded captains and
   79 % of seeded riders are `appLanguage: 'Arabic'`.
3. **The placeholder syntax does not match the engine.** `VARIABLE_PATTERN` at `emails.ts:159` is
   `/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g` — **double** braces. Every messaging template uses **single**
   braces. If these rows are ever fed to `substituteVariables`, not one placeholder will match and
   every message will ship its own source code. The type's comment anticipates growth into the
   email shape; the fixtures are already incompatible with it.

### 2.3 Push: no preview before, and no record after

`PushBroadcast` stores `body` (`types/email.ts:384`). `PushBroadcastsCard.tsx:105–140` renders the
title, the id, the state, the audience, the date, the device count and the open rate. **It never
renders `body`, and never renders `deepLink`.** So an operator who sends a broadcast has no preview
before the send and no way to read back what they said afterwards. The one field a recall would
need to be justified against is stored and hidden.

The composer also has no `dir` on either content field (`:173`, `:180`) while the *deep link* field
does (`:190`, `dir="ltr"`, correctly reasoned in a comment as §9.2). The reasoning was applied to
the one field that is always Latin and not to the two that may be Arabic. An Arabic push title
ending in a question mark renders that mark on the wrong side of the string in the composer.

### 2.4 The conversation and ticket bodies

`ConversationPane.tsx:748` and `:777`:

```jsx
<p className="text-sm whitespace-pre-wrap text-foreground">{message.body}</p>
```

No `dir="auto"`. An inbound Arabic message from a rider is laid out in an LTR paragraph. Pure
Arabic survives the bidi algorithm; **mixed content does not** — an Arabic sentence containing
`TRP-24817`, a fare, or trailing `؟` reorders. The fix is already in this codebase and already
argued: `components/metrics/BreakdownList.tsx:390–406` applies `dir="auto"` to a truncating label
for precisely this reason, and `NotificationBell.tsx:261,270` does the same. Three files got it;
the two files that render *customer speech* did not.

Neither the composer nor the pane knows the customer's language. `types/conversation.ts` and
`types/ticket.ts` carry no language field, so an operator replying to a rider cannot see whether
that rider reads Arabic. The data exists — `types/rider.ts:65` and `types/driver.ts:99` carry
`appLanguage`, and `clients/riders.ts:174` even makes it a **facet** — it is simply not joined onto
a conversation.

---

## 3. Placeholders — the hard case, answered specifically

The owner asked whether an operator can ship *"Hello {riderName}"*. Three different answers,
depending on the surface:

| Surface | Can a placeholder ship unresolved? |
|---|---|
| Email template | **No, for undeclared ones** — `emailTemplateIssues` makes it a save-blocking error that names the variable (`emails.ts:190–226`), enforced twice: the editor disables the save in place and `saveEmailTemplate` throws a 422 anyway (`emails.ts:551–570`). This is the right pattern. |
| Email template | **Yes, for *declared* ones with a default sample** — the `Declare` fix writes `sample: name`, so the preview reads `promoCode` where the customer will read a real code. The operator sees something that looks resolved and is not. §2.1(b). |
| Push broadcast | **n/a and worse** — there is no placeholder syntax, so a broadcast cannot say a rider's name at all. Not a defect in the preview; a ceiling on the product. |
| Notification templates | **Yes, and it is the only rendering** — §2.2. |

So the honest scoring is: **the product solves the placeholder problem exactly once, and the
solution has a hole in it that the product's own "fix this for me" button walks straight into.**

---

## 4. The flexibility ceiling, per surface

What an operator can change, and the wall they hit.

| # | Surface | Can change | Wall |
|---|---|---|---|
| 1 | Email template | Subject, body, which variables are declared | No rich text/HTML. No new template (a missing locale offers **no button** — a stated design decision at `EmailTemplatesCard.tsx:12–16`, and the right one). No new template *key* (`EmailTemplateKey` is a closed union of 6). No sample editing. No draft, schedule, test send, version history, rollback. |
| 4 | Sender identity | Which one is default; request verification | **Cannot create one. Cannot edit a display name, an address or a reply-to.** `SenderIdentity.displayName` is documented as *"Operator-authored content"* (`types/email.ts:81`) and no operator surface authors it. |
| 5 | Push broadcast | Title, body, deep link, one of 4 audiences | No personalisation, no per-language variant, no segmentation beyond the 4-member union, no image, no draft, no schedule, no test send, **no recall**, no audit row. Sent on one click. |
| 6 | Notification templates | **Nothing.** | Read-only card. |
| 7 | Conversation reply | Body, register (reply/note), reply-by-email toggle | **No canned responses / macros** — specced as P5-T8 (`clients/index.ts:820`), not built. Draft is a module-scoped `Map` (`drafts.ts`): survives navigation, dies on reload, indicated nowhere (§8.6.9, deliberate). No attachments on outbound. No scheduled send. |
| 8 | Ticket reply | Body | **No draft at all** — plain `useState`, lost on any unmount. No templates. No preview. |
| 9–10 | Plan copy | Name EN/AR, existing feature lines EN/AR, status, 4 numbers, 2 switches | **Cannot add or remove a feature line** — the card only renders `features.map` and there is no add control; the section vanishes entirely when the array is empty. **Cannot create a plan** — no `createPlan` in `clients/pricing.ts`, and `PlanKey` is closed. Pricing half disabled behind Q7. |
| 11 | Reason codes | Both labels, surfaces, tier, owner team, guide reference, note-required | **Key immutable after create — correct, see §8.** Cannot delete — correct. No preview of the picker. Audit records *which* fields changed, not their previous values. |
| 12 | Cities | Add a city (EN + AR both required, `OperationalCards.tsx:267`), toggle its services | Cannot rename. Cannot remove. |
| 13 | Zones | **Nothing.** | `clients/zones.ts` exports no mutation on a zone's identity. No Arabic name field exists on the type. |

### 4.1 The five things that exist nowhere in the product

Grepped, not assumed:

| Capability | Evidence |
|---|---|
| **Draft** of authored content | Only `drafts.ts`, a 5-entry in-memory `Map` for the conversation composer, explicitly *not* persisted. Nothing else. |
| **Schedule / send later** | `grep -i "scheduleAt\|scheduledFor\|sendAt\|test send\|sendTest"` → **zero matches** in `src/screens` and `src/data`. |
| **Test send to yourself** | same grep, zero. |
| **Version history** | `EmailTemplate.version` increments and the previous row is **overwritten in place** (`emails.ts:583–597`). No history array, no `listTemplateVersions`, no diff. |
| **Rollback** | nothing anywhere. |

Shopify's email overview (`06-marketing/email-app-overview-campaigns-table.webp`) shows *Recent
drafts* as thumbnails with a `Draft` status chip in the campaigns table, and the schedule modal
(`marketing-email-campaign-schedule-send-modal.webp`) offers *Tomorrow at 9:00 pm · Now · Custom
date and time* with the whole thing headed `Draft · Last edited January 15, 2024 at 5:23 AM`. Three
capabilities Eyvar has none of, on one screen.

---

## 5. Can an operator undo or recover?

The owner's scenario: *a template edited wrongly and used for a week.*

**No, and the product cannot even tell you what it used to say.**

| Layer | State |
|---|---|
| The record | `saveEmailTemplate` replaces `subject`, `body` and `variables` and bumps `version`. The prior text is gone from the process. |
| The audit log | `AuditAction` declares `'emailTemplate.save'` (`types/audit.ts:85`) and `'senderIdentity.setDefault'` (`:83`). **Neither is ever written.** `grep -rn "emailTemplate.save" src/` returns exactly one hit: the union member itself. `clients/emails.ts:35` is honest about it in a header comment. |
| Push broadcasts | **No audit action exists at all** — nothing in the 45-member union covers a broadcast. |
| The delivery log | `EmailDelivery` has `subject` but **no `body`** (`types/email.ts:290–340`), and `EmailLogCard` has no row detail or drawer. So "what did we actually send this customer?" is unanswerable from the console. |
| `EmailDelivery.locale` | Crosses the seam and is **rendered nowhere** — `grep -n locale EmailLogCard.tsx` → no matches. So "did we mail this Arabic rider in Arabic?" is also unanswerable. |

The pieces to fix this are all present: `appendAudit` exists and eleven clients call it, the audit
actions are already declared, and `types/policy.ts:371` already models a `changedFields` diff. The
email client just does not call any of it.

**Where recovery does work:**

- **Policy and reason codes.** `AdminPolicyScreen.tsx:89` has a real `discard` wired to the shell
  save bar with `canDiscard: true` and a dirty-state guard — a *pre-save* undo, correctly scoped.
  `reasonCode.save / retire / restore / create` all write audit rows (`clients/policy.ts:192, 380,
  445, 527, 572`), and `restoreReasonCode` is a genuine inverse of `retireReasonCode` reachable from
  the same kebab.
- **Retirement instead of deletion.** `ReasonCodeState` has no `deleted` member and the type says
  it never will (`types/policy.ts:243–249`). A retired code leaves the picker and keeps resolving
  forever, with its successor recorded. This is the best-reasoned piece of content modelling in the
  repo.
- **The in-use gate.** Saving a live template raises a two-step confirmation naming the template and
  its send count — *"{name} is sent by a live system event and has been sent {count} times. Saving
  changes what customers receive from the next send onwards."* — and the client refuses an
  unconfirmed save with a 409 regardless (`emails.ts:572–578`). A gate that is a contract, not a
  courtesy. It does not substitute for rollback, but it is the right shape.

See [`06-undo-and-recovery.md`](06-undo-and-recovery.md) for the same finding at product scale.

---

## 6. Arabic — what is right and what is not

**Right, and worth protecting:**

- Four surfaces are bilingual **by type**, not by convention: `ReasonCodeLabels {en, ar}`,
  `OperatingCity {nameEn, nameAr}`, `SubscriptionPlan {nameEn, nameAr}` + `PlanFeature {en, ar}`,
  and `EmailTemplate` keyed on the pair `(key, locale)`.
- **Both labels are required.** `ReasonCodesCard.tsx:433` and `OperationalCards.tsx:267` both refuse
  to submit without the Arabic half. You cannot create half a bilingual record.
- **The locale gap is a first-class screen element.** `listEmailTemplateCoverage` computes which
  system events cannot mail an Arabic-speaking customer, and the card renders that answer rather
  than counting rows itself. The help line is honest about the consequence: *"A customer whose
  language has no template is sent the other language instead."*
- The Arabic template fixtures carry **Arabic samples** (`نورة الحربي`, `٢٥ يونيو ٢٠٢٦`), so the
  Arabic preview is a real Arabic message, not English text flipped.
- Arabic inputs carry `dir="rtl" lang="ar"` at every reason-code and city call site.

**Wrong:**

| Defect | Sites |
|---|---|
| No `dir="auto"` on any field or bubble carrying customer speech | `PushComposerModal.tsx:173,180`, `MessageComposer.tsx:274`, `TicketDetailScreen.tsx:391`, `ConversationPane.tsx:748,777`, `TemplateEditorDialog.tsx:178,189` |
| Arabic template body authored in `font-mono` (no Arabic coverage) and previewed in Naskh | `TemplateEditorDialog.tsx:195` |
| Push broadcast is monolingual by construction — one title, one body, no locale field | `types/email.ts:366–400` |
| Notification templates are monolingual by construction | `types/email.ts:390–405` |
| Zone names have no Arabic field | `types/zone.ts:128` |
| Conversation / ticket do not carry the customer's `appLanguage` | `types/conversation.ts`, `types/ticket.ts` |
| **`font-arabic` is not a defined utility.** Five call sites (`ReasonCodesCard.tsx:177,516`, `OperationalCards.tsx:186,317`) apply a class Tailwind generates no CSS for — there is no `--font-arabic` in `globals.css`. | Harmless in effect (`--font-sans` already leads with Naskh for Arabic codepoints) but it is a guarantee the stylesheet does not make. Dead class, or a missing token. |

---

## 7. Length and truncation — will the operator learn before sending?

**No, on every surface.**

| Surface | Limit that really exists | Told before sending? |
|---|---|---|
| Push title | iOS/Android lock-screen truncation | **No.** No counter, no guidance, no preview. |
| Push body | ~4 lines expanded, ~2 collapsed | **No.** |
| SMS notification template | 160 GSM-7 / **70 UCS-2 for Arabic** — an Arabic SMS costs 2.3× the segments | **No.** The channel is badged `SMS` and nothing else about it is said. |
| Email subject | mail-client list truncation | **No.** |
| Plan name EN | `PLAN_TEXT_MAX_CHARS = 60`, advisory | **No counter** — `PlanEditorScreen.tsx:337` passes no `count` prop, while `:342` does for the Arabic name. |
| Plan name AR | same | **Yes.** |
| Plan feature EN + AR | 60, **server-enforced** (`clients/pricing.ts:199`) | **Yes**, counter on both halves, `formatCount`-localised. |
| Reason-code / city labels | none defined | n/a |

The plan-name asymmetry is the tell: the counter mechanism is built, localised, and correct; it was
simply attached to three of the four name-shaped fields on that screen.

The Arabic SMS point is the expensive one. `payout_processed` is an SMS to captains, 92 % of whom
read Arabic, and an Arabic SMS switches the encoding to UCS-2 at 70 characters per segment. Nothing
in the product mentions segments.

---

## 8. Where flexibility is correctly withheld

The owner asked for this explicitly, and the answer is that this codebase is better at saying no
than at saying yes.

| Withheld | Where | Why it is right |
|---|---|---|
| **A reason code's key** | `SaveReasonCodeInput` (`types/policy.ts:376–384`) omits `key`; `ReasonCodesCard.tsx:485` renders the key input **only** when `isCreate` | Historical records point at the string. A renamed key turns a two-year-old decision into a raw `TRP_GHOST_COMPLETE` on an audit line. Enforced by the type, not by a disabled attribute. |
| **Deleting a reason code** | `ReasonCodeState` is `'active' \| 'retired'` and will never grow `deleted` | Same reason. Retirement removes it from the picker and `resolveReasonCode` answers forever, with `supersededByKey` recording where the traffic went — which is the half legacy left as folklore. |
| **Money formatting** | `formatMoney`, integer halalas, `parseMoneyInput` on the digit string | `19.99 * 100 === 1998.9999999999998` is how a halala goes missing. Not an author's decision, and the plan editor's `DisabledField`s prove the point by refusing to let anyone type into a formatted value. |
| **`deliveredCount`** | `emails.ts:773`, from `audience.deviceCount` | It was `142`, invented on every send, in the code this replaced. A number an operator reads as a result must come from a record. |
| **The pricing half of the plan editor** | Disabled inputs, visually distinct from adjacent derived values (§8.2, AC-392) | Q7 is open. A disabled control that says so beats a wired control that silently drops the value — which is what the old `status` select did. |
| **A dead "create template" button** | `EmailTemplatesCard.tsx:12–16` renders **no** control for a missing locale | §11.2's "disabled in place with a reason" is for an action that exists and is refused, not one that was never built. A permanently dead control is worse than a stated gap. Correct reading of the rule. |
| **Rich text anywhere** | no editor in the repo | Right for SMS and push, which are plain text by protocol. Arguable for email — see §9. |
| **A save bar on the conversation composer** | `MessageComposer.tsx:1–20`, §8.6 | A composer sends; it does not save. The absence of §4's apparatus is the rule, not an omission. |
| **Free-form push audiences** | `PushAudienceId` is a closed 4-member union | An audience typed as a query is an audience nobody can review before it fires. |

### 8.1 The one place the discipline leaked

`fixtures/emails.ts:749` — `sampleText: 'Your weekly payout of SAR {amount} has been transferred…'`

The currency code is **baked into authored content**. Every other money string in the product goes
through `formatMoney`, and the whole point of that is that an author does not choose how money
reads. Here `SAR` sits in a template body, ahead of a placeholder, on a message that is
Arabic-facing for 92 % of its recipients — where the currency belongs *after* the number and where
`formatMoney`'s locale handling would have put it. Because notification templates are not editable,
this is currently a fixture problem; the moment they become editable it is an authoring policy
problem, and the boundary should be drawn before the editor is built, not after.

---

## 9. What to add, ranked

Split as the owner asked. **Missing** = the capability does not exist. **Poor** = it exists and is
weak. Rank is by harm per unit of work.

### 9.1 Missing

| # | Add | Why now | Rough size |
|---|---|---|---|
| **M1** | **A preview panel on the push composer** — the message in a lock-screen/notification frame, with the audience and device count restated | 28 460 devices, one click, no rehearsal. The single riskiest act in the product is the one with the least support. | M |
| **M2** | **An editor for notification templates**, with the email editor's preview, validator and locale pair | These are the highest-volume messages in the product, they are shown to operators as raw source, and they cannot be changed at all. Reuses `renderEmailPreview` almost as-is. | L |
| **M3** | **A locale on `MessagingTemplate` and on `PushBroadcast`** | 79 % of riders and 92 % of captains read Arabic and receive a monolingual message. This is a data-model change and blocks M1 and M2 from being finished properly, so decide it first. | M — needs product-owner |
| **M4** | **Write the audit rows that are already declared** — `emailTemplate.save`, `senderIdentity.setDefault` — and add one for a push broadcast | Two union members exist and are never written; the third does not exist. `appendAudit` is one call. Highest ratio of value to effort in this report. | **S** |
| **M5** | **Version history on `EmailTemplate`** — keep the prior `{subject, body, variables}` per version, list them, allow restore-as-new-version | Directly answers *"edited wrongly and used for a week."* Restore-as-new-version keeps the append-only discipline the rest of the model has. | M |
| **M6** | **Test send** — one address, the operator's own, on the email editor and the push composer | The cheapest possible substitute for every fidelity gap in §2.1(a). | S |
| **M7** | **Draft + scheduled send** on the push composer | Both are on Shopify's equivalent screen; both are the difference between "compose and fire" and "compose, review, send". | L |
| **M8** | **Language segmentation on push audiences** | `appLanguage` is already a rider facet (`clients/riders.ts:174`). Adding `arabic-riders` / `english-riders` to `PushAudienceId` is a small change that makes a bilingual broadcast possible without M3's full model change. | S |
| **M9** | **Canned responses in the conversation composer** (P5-T8, already specced) | Named in `clients/index.ts:820` and `clients/preferences.ts:17` as a real artefact class with an owner and an audit trail. Never built. | M |
| **M10** | **`body` on `EmailDelivery`, and a row detail** | "What did we actually send this customer" is currently unanswerable. Also render `EmailDelivery.locale`, which already crosses the seam. | S |
| **M11** | **Sender identity create / edit** | `displayName` is typed as operator-authored content with no author. | S |
| **M12** | **Add / remove a plan feature line** | The editor can change six lines and not make a seventh. | S |
| **M13** | **Zone Arabic names, and a zone name editor** | Or a written decision that zone names are engineering-owned — either is fine, the silence is not. | S — needs product-owner |

### 9.2 Present but poor

| # | Fix | Where |
|---|---|---|
| **P1** | **Let the operator edit a variable's sample, and stop `Declare` writing `sample: name`.** Until then the button that offers to fix a template is the one that breaks its preview. | `TemplateEditorDialog.tsx:112–116, 200–208` |
| **P2** | **`dir="auto"` on every field and bubble carrying customer speech.** The precedent is already in the repo at `BreakdownList.tsx:406`. | `PushComposerModal.tsx:173,180` · `MessageComposer.tsx:274` · `TicketDetailScreen.tsx:391` · `ConversationPane.tsx:748,777` · `TemplateEditorDialog.tsx:178,189` |
| **P3** | **Drop `font-mono` from the template body**, or apply it only to `locale === 'en'`. Arabic in `ui-monospace` is a worse editing experience than the preview beside it. | `TemplateEditorDialog.tsx:195` |
| **P4** | **Character counters on the push title, the push body, the email subject and the EN plan name.** The mechanism exists (`ui/textarea.tsx` header, `InputGroup`) and is used by no authoring surface. | four sites |
| **P5** | **Say the SMS segment count on any Arabic-capable SMS surface.** 70 characters, not 160. | wherever M2 lands |
| **P6** | **Render `PushBroadcast.body` and `deepLink` on the history card.** The field is stored and hidden. | `PushBroadcastsCard.tsx:105–140` |
| **P7** | **Give the ticket reply the conversation composer's draft store**, or say in the spec that it deliberately has none. | `TicketDetailScreen.tsx:391` |
| **P8** | **Join `appLanguage` onto a conversation and a ticket**, and show it beside the customer. An operator replying to an Arabic rider currently cannot know. | `types/conversation.ts`, `types/ticket.ts` |
| **P9** | **Record previous values in the reason-code audit detail**, not just `changedFields.length` and a field-name list. | `clients/policy.ts:444–456` |
| **P10** | **`comms.toast.broadcastSent` is written and unreachable.** Either fire it on send or delete it — a written string with no call site is a promise the screen does not keep. R9-compliant as written (35 chars). | `copy.ts:250`, `AdminCommunicationsScreen.tsx:80` |
| **P11** | **`font-arabic` generates no CSS.** Define `--font-arabic` in `globals.css` or remove the five call sites. | `ReasonCodesCard.tsx:177,516` · `OperationalCards.tsx:186,317` |
| **P12** | **Show the sender identity in the template preview.** The card that owns identities is on the same page; the preview does not name which one the mail will carry. | `TemplateEditorDialog.tsx:210` |

---

## 10. Questions this assessment cannot answer

For product-owner. **Not decided here.**

1. **Are reason-code labels rider-facing?** `ReasonCodeLabels` requires Arabic, and the console is
   English-only today, which implies either bilingual operators or an app surface. If a cancellation
   reason appears in the rider's app, these labels are content and need the preview and the audit
   treatment of one. If not, the Arabic requirement needs a different justification.
2. **Who writes the steering-offer message captains receive?** (`#14`.) The operator chooses an
   amount and sees no text. Somebody authors that string; it is not in this repo.
3. **Is a plan name limited?** `PLAN_TEXT_MAX_CHARS = 60` is enforced on feature lines and advisory
   on names, and `PlanEditorScreen.tsx:78–91` explicitly raises this. Advisory-on-one-and-not-the-
   other is not a stable state.
4. **Should zone names be operator-editable, and bilingual?** Currently neither, with no recorded
   decision.
5. **Should email templates support HTML?** Withholding rich text is defensible; withholding it
   *silently*, on the one channel that renders it, is a decision nobody has written down.
6. **Which locale does the system pick when it mails a customer?** `EmailDelivery.locale` exists,
   `appLanguage` exists on riders and captains as a display string (`'Arabic' | 'English'`, not an
   `EmailLocale`), and nothing in the repo joins the two. The templates card tells operators *"a
   customer whose language has no template is sent the other language instead"* — a sentence that
   presumes a selection rule the product does not implement.
