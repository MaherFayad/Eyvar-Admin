/**
 * **The message composer — `DESIGN.md` §8.6, `design/11-conversation-composer.md`.**
 *
 * §8.6 exists because neither §4 nor §3.8 governs this control. §4 governs a
 * form that **saves** — dirty state, a save bar, a discard, an idempotent
 * primary. This one **sends**, and §8.6's opening table is the list of §4
 * apparatus it must not grow:
 *
 * > A composer MUST NOT raise a save bar, MUST NOT register an unsaved-changes
 * > guard, and MUST NOT prompt on navigation away.
 *
 * There is no `useForm` here and no `saveBar` call, and that absence is the
 * rule, not an omission.
 *
 * Rules applied
 *   §8.6.1     **at the foot of the thread**, which overrides §3.8's *"composer
 *              above the feed"* for a conversation thread and for nothing else.
 *              The pane owns the position; this component owns the content.
 *   §8.6.2     **five carriers for the register, none of them colour** — the
 *              segment at rest, the field's ground, the placeholder, the send
 *              label, and the line beneath. All five are below and all five
 *              survive greyscale. A checkbox, a menu item or a send-button
 *              modifier is forbidden by the rule, not merely discouraged.
 *   §8.6.3     `Send` is **disabled in place, at rest, never hidden**, with its
 *              reason as REAL TEXT beneath the composer and `aria-describedby`
 *              pointing at it. **A `title=` is not a reason.** An EMPTY FIELD
 *              disables it and renders **no** reason — a sentence on every
 *              keystroke is noise.
 *   §8.6.4     **no confirmation on send.** D18 governs registry commands; a
 *              send has no arity and no affordance, and the broad reading makes
 *              D22's 45-second promise unmeetable at a cap of three. Recorded as
 *              F-1; the design ships on the narrow reading.
 *   §8.6.3 / R10
 *              **no toast on send.** The message at the foot of the thread is
 *              the confirmation: it persists, it carries the delivery state, and
 *              it is where the operator is already looking.
 *   §8.6.5     `Reply by email` is **one toggle whose label never changes**,
 *              carrying `aria-pressed`. A control that renames itself cannot
 *              carry a reason that stays true.
 *   §8.6.8     **one refusal per screen, not one per control.** Every refused
 *              control here points `aria-describedby` at the single sentence.
 *   §8.6.9     the draft is **in memory, session-lived, and indicated nowhere**.
 *   §9.1       nothing is anchored to a physical edge. The register sits at the
 *              inline-start of its row and `Send` at the inline-end of its own,
 *              which is where the sentence ends in both reading directions.
 *   §7.2       the field's focus ring is `textarea.tsx`'s own, and the
 *              primitive already pairs its outline suppression with a visible
 *              ring. Nothing here removes either, and the utility names are
 *              deliberately not written into this comment — a hyphenated
 *              utility in prose is a valid Tailwind candidate and has shipped a
 *              real CSS rule out of a doc comment in this repo before.
 */

import { useEffect, useId, useRef, useState } from 'react'
import type { ConversationChannel, Message, MessageVisibility } from '@/data/types'
import type { Translate } from '@/lib'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { clearDraft, readDraft, writeDraft } from './drafts'

export interface ComposerProps {
  conversationId: string
  channel: ConversationChannel
  t: Translate

  /**
   * **The one sentence for the whole screen** (§8.6.8). `null` means the
   * composer is live. Non-null disables the field, the register and the send
   * control, and renders once beneath them.
   */
  refusal: string | null
  /**
   * §8.6.3 — the loading row is the one refused state with **no reason line**.
   * *"A reason for a state that lasts 300 ms is a flash of text, which is worse
   * than nothing."*
   */
  quietlyDisabled: boolean

  /**
   * §8.6.3 — **`phone` renders the note register only**; the `Reply` segment is
   * absent, because a call has no customer-visible message to compose.
   */
  noteOnly: boolean

  /**
   * §8.6.5 — `Reply by email` renders **only** where the conversation's primary
   * channel is not already email and the conversation can carry a second one,
   * which today is `chat` alone. `refusal` on it is its own, separate from the
   * screen's: the switch is what chose the channel, so the switch carries the
   * reason (§8.6.5's table).
   *
   * `address` is the address the reply would use, or `null` when there is none
   * — in which case `refusal` is set and the toggle is dead. It is named in the
   * footer once the toggle is pressed, which is one of the three things carrying
   * what §5.0's confirmation row was protecting (§8.6.4).
   */
  emailSwitch: { address: string | null; refusal: string | null } | null

  /**
   * The body restored by `Send again`, or `null`. Sets the field, focuses it and
   * puts the caret at the end (§8.6.7). `messageId` is carried so the next press
   * can be a **retry of that line** rather than a second one — see `retryOf`.
   */
  restored: { body: string; messageId: string; token: number } | null

  /** Resolves with the accepted message, or throws with an operator sentence. */
  onSend: (input: { body: string; visibility: MessageVisibility; byEmail: boolean }) => Promise<Message>
  /**
   * Retry one failed message **under its own id**. Called instead of `onSend`
   * when the operator presses send on a restored body they have not edited.
   */
  onRetry: (messageId: string) => Promise<Message>
}

export function MessageComposer({
  conversationId,
  channel,
  t,
  refusal,
  quietlyDisabled,
  noteOnly,
  emailSwitch,
  restored,
  onSend,
  onRetry,
}: ComposerProps) {
  /* **`internal` when the channel has no customer-visible send.** Not a default
     that can drift: `phone` has no `Reply` segment at all, so the state cannot
     hold a value the UI does not offer. */
  const [register, setRegister] = useState<MessageVisibility>(noteOnly ? 'internal' : 'customer')
  const [body, setBody] = useState(() => readDraft(conversationId, noteOnly ? 'internal' : 'customer'))
  const [byEmail, setByEmail] = useState(false)
  const [sending, setSending] = useState(false)
  /* The rejection sentence — §8.6 §6: *"the optimistic message is removed, the
     body is restored to the field, and the reason renders under the composer."* */
  const [rejection, setRejection] = useState<string | null>(null)
  const [restoredNotice, setRestoredNotice] = useState(false)
  /**
   * **The line `Send again` restored, and the exact text it restored.**
   *
   * The next press is a **retry** only while the body is byte-identical to what
   * was restored. Edit one character and it becomes a new message, because a
   * different sentence is a different message and belongs on its own transcript
   * line. Comparing the text rather than tracking an "edited" flag is what makes
   * typing a character and deleting it again behave correctly.
   */
  const [retryOf, setRetryOf] = useState<{ messageId: string; body: string } | null>(null)

  const field = useRef<HTMLTextAreaElement | null>(null)
  const reasonId = useId()

  /* §8.6.9 — the draft, per conversation AND per register. Switching register
     swaps the text, because a reply and a note are two different messages to
     two different audiences. */
  useEffect(() => {
    setBody(readDraft(conversationId, register))
    setRestoredNotice(false)
    setRejection(null)
    setRetryOf(null)
  }, [conversationId, register])

  useEffect(() => {
    writeDraft(conversationId, register, body)
  }, [conversationId, register, body])

  /* §8.6.7 — `Send again` **restores the body into the composer, focused, caret
     at the end, and does not send.** The token is what makes a second press of
     the same message re-fire the effect. */
  useEffect(() => {
    if (restored === null) return
    setRegister('customer')
    setBody(restored.body)
    setRestoredNotice(true)
    setRetryOf({ messageId: restored.messageId, body: restored.body })
    const node = field.current
    if (node) {
      node.focus()
      node.setSelectionRange(restored.body.length, restored.body.length)
    }
  }, [restored])

  const empty = body.trim() === ''
  const blocked = refusal !== null || quietlyDisabled
  /* §8.6.3 — an empty field disables the control and renders NO reason. The two
     halves are separate booleans for exactly that reason. */
  const sendDisabled = blocked || empty || sending

  async function send() {
    if (sendDisabled) return
    const outgoing = body
    setSending(true)
    setRejection(null)
    /* §8.6 §6 — **the composer clears immediately.** The message is already in
       the thread reading `Sending…`; leaving the text in the field as well
       shows the operator their sentence twice. */
    setBody('')
    clearDraft(conversationId, register)
    setRestoredNotice(false)
    try {
      /* §8.6.7 — unedited, so this is the same transcript line trying again;
         edited, so it is a new one. `retryMessage` re-uses the id and logs the
         failed attempt on `deliveryHistory`, which is why the thread does not
         grow a duplicate of a sentence the customer received once. */
      const retrying = retryOf !== null && retryOf.body === outgoing && register === 'customer'
      if (retrying) await onRetry(retryOf.messageId)
      else await onSend({ body: outgoing, visibility: register, byEmail })
      setRetryOf(null)
      field.current?.focus()
    } catch (error) {
      setBody(outgoing)
      setRejection(operatorSentence(error, t))
      field.current?.focus()
    } finally {
      setSending(false)
    }
  }

  /* §8.6.3 — **WhatsApp renders no composer at all**, and says so in one grey
     sentence in its place. D19: *"a compose box for a pipe that does not exist
     is the worst possible state — the operator types, presses send, and the
     message goes nowhere."* The difference from `phone` is that phone has
     notes and WhatsApp has nothing. */
  if (channel === 'whatsapp') {
    return (
      <p className="border-t border-border pt-3 text-sm text-muted-foreground">
        {t('conversations.composer.whatsapp')}
      </p>
    )
  }

  const noteRegister = register === 'internal'

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-3">
      {/* Carrier 1 — the register, **at rest, above the field**. Never a
          checkbox, never a menu item, never a modifier on the send button
          (§8.6.2). `ToggleGroup` is a roving-focus group, so `←`/`→` move
          between the segments and the primitive mirrors them in Arabic. */}
      {!noteOnly && (
        <ToggleGroup
          type="single"
          variant="outline"
          size="sm"
          value={register}
          aria-label={t('conversations.composer.register')}
          onValueChange={(next) => {
            if (next === 'customer' || next === 'internal') setRegister(next)
          }}
          className="w-fit"
        >
          <ToggleGroupItem
            value="customer"
            disabled={blocked}
            aria-describedby={refusal ? reasonId : undefined}
          >
            {t('conversations.composer.reply')}
          </ToggleGroupItem>
          <ToggleGroupItem
            value="internal"
            disabled={blocked}
            aria-describedby={refusal ? reasonId : undefined}
          >
            {t('conversations.composer.note')}
          </ToggleGroupItem>
        </ToggleGroup>
      )}

      {/* Carrier 2 — **the field's ground changes material** between registers,
          and carrier 3, the placeholder, changes with it. Both are tokens the
          system already has: `bg-card` is `--ev-surface`, `bg-muted` is
          `--ev-bg2`. No new colour. */}
      <Textarea
        ref={field}
        rows={3}
        value={body}
        disabled={blocked}
        aria-describedby={refusal ? reasonId : undefined}
        aria-label={t(noteRegister ? 'conversations.composer.note' : 'conversations.composer.reply')}
        placeholder={t(
          noteRegister
            ? 'conversations.composer.placeholder.note'
            : 'conversations.composer.placeholder.reply',
        )}
        className={noteRegister ? 'bg-muted' : 'bg-card'}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          /* §8.6 §6 — `Enter` sends in **both** registers. A special case here
             is a surprise, and the line beneath already states which register
             is active. `Shift + Enter` adds a line; `⌘/Ctrl + Enter` also
             sends, because the muscle memory costs nothing. */
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault()
            void send()
            return
          }
          /* `Esc` blurs to the thread. It does **not** clear the field and it
             does not close the pane — an operator who has typed four sentences
             and pressed `Esc` to dismiss an autocomplete must not lose them. */
          if (event.key === 'Escape') {
            event.currentTarget.blur()
          }
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        {/* §8.6.5 — one toggle, `aria-pressed`, and **the label never changes**.
            Disabled in place with its own reason when the customer has no
            address on that channel. */}
        {emailSwitch !== null && (
          <Toggle
            variant="outline"
            size="sm"
            pressed={byEmail}
            disabled={blocked || emailSwitch.refusal !== null}
            aria-describedby={emailSwitch.refusal !== null ? `${reasonId}-email` : undefined}
            onPressedChange={setByEmail}
          >
            {t('conversations.composer.byEmail')}
          </Toggle>
        )}

        <Button
          /* R2 / R3 — `default` is the near-black `--ev-ink` primary, and it is
             the only filled button in the main column. Not green, not blue. */
          className="ms-auto"
          disabled={sendDisabled}
          aria-describedby={refusal ? reasonId : undefined}
          onClick={() => void send()}
        >
          {/* Carrier 4 — **the send label names the register.** */}
          {t(noteRegister ? 'conversations.composer.addNote' : 'conversations.composer.send')}
        </Button>
      </div>

      {/* Carrier 5 — the line beneath the composer, which is the one that says
          out loud that a note is not sent. `[observed]` in structure from
          Shopify's `Only you and other staff can see comments`; the wording is
          Eyvar's, because Eyvar's composer can also send and Shopify's cannot. */}
      <p className="text-xs text-muted-foreground">
        {t(noteRegister ? 'conversations.composer.keys.note' : 'conversations.composer.keys.reply')}
      </p>

      {/* §8.6.5 — the address the reply will actually use, named before the
          press. This is one of the three things carrying what §5.0's
          confirmation row was protecting. */}
      {emailSwitch?.address != null && byEmail && (
        <p className="text-xs text-muted-foreground">
          {/* §9.4 — **the address is bidi-isolated.** Unisolated, an Arabic
              paragraph reorders the `@` and the TLD and the operator is shown an
              address that is not the one the message will go to. */}
          <bdi>
            {t('conversations.composer.byEmail.pressed', { address: emailSwitch.address })}
          </bdi>
        </p>
      )}

      {emailSwitch?.refusal != null && (
        <p id={`${reasonId}-email`} className="text-xs text-muted-foreground">
          {emailSwitch.refusal}
        </p>
      )}

      {/* §8.6.8 — **the one refusal sentence**, real text, keyboard-reachable,
          pointed at by every refused control above. Never a tooltip (§11.2,
          D17 clause 3, §5.7). */}
      {refusal !== null && (
        <p id={reasonId} className="text-xs text-muted-foreground">
          {refusal}
        </p>
      )}

      {restoredNotice && (
        <p className="text-xs text-muted-foreground">{t('conversations.composer.restored')}</p>
      )}

      {rejection !== null && <p className="text-xs text-foreground">{rejection}</p>}
    </div>
  )
}

/**
 * The rejection sentence, chosen from the error rather than written by the
 * screen — `12-refusal-and-undo-surfaces.md` §3.3's rule applied to a send.
 *
 * The clients already write `ApiError.message` as an operator sentence, so the
 * only two that need their own wording are the two whose server text would be
 * about the software: a 409 on a conversation that closed underneath the
 * operator, and a transport failure that never reached a server at all.
 */
function operatorSentence(error: unknown, t: Translate): string {
  const status = (error as { status?: unknown } | null)?.status
  if (status === 409) return t('conversations.composer.rejected.closed')
  const kind = (error as { kind?: unknown } | null)?.kind
  if (kind === 'network') return t('conversations.composer.rejected.network')
  const message = (error as { message?: unknown } | null)?.message
  return typeof message === 'string' && message !== ''
    ? message
    : t('conversations.composer.rejected.network')
}
