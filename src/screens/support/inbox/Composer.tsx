/**
 * The inbox composer (design 12 §5, §5.x / AC-CC-11, §8.6). Six register
 * carriers, none colour alone: the segmented pair, the whole surface moving to
 * `--ev-note`, the standing consequence line, the placeholder, `Send` filled
 * against `Add note` secondary, and the key hint. Drafts per conversation and
 * register (§8.6.9); refusals as real text with `aria-describedby` (§8.6.3).
 */

import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { sendTypingIndicator } from '@/data/clients'
import type { ConversationChannel, Message, MessageVisibility } from '@/data/types'
import type { MessagingTemplateSurface } from '@/data/types/email'
import type { Translate } from '@/lib'
import { useAnnounce } from '@/hooks'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import { Toggle } from '@/components/ui/toggle'
import { FileTextIcon, NoteIcon, SendIcon } from '@/components/icons'
import { cn } from '@/lib/utils'
import { TemplatePicker } from '../shared/TemplatePicker'
import { clearDraft, readDraft, writeDraft } from './drafts'

/** §8.7: `typing: true` is re-published at most once a second. */
const TYPING_DEBOUNCE_MS = 1_000

export interface ComposerHandle {
  /** Focus the field, switching register first when one is named. */
  focus: (register?: MessageVisibility) => void
  toggleRegister: () => void
}

export interface ComposerProps {
  /** The id of the one refusal sentence, so a header control can point at it (§8.6.8). */
  reasonId?: string
  conversationId: string
  channel: ConversationChannel
  customerName: string
  /** The conversation's channel, as a word, for the consequence line. */
  channelLabel: string
  t: Translate
  /** §8.6.8: the one refusal sentence, or `null` when the composer is live. */
  refusal: string | null
  /** §8.6.3: the loading row is refused with no reason line. */
  quietlyDisabled: boolean
  /** `phone`: note register only. */
  noteOnly: boolean
  /** §8.6.5: `Reply by email`, only where the conversation can carry email. */
  emailSwitch: { address: string | null; refusal: string | null } | null
  /** §8.6.7: a body restored by `Send again`. */
  restored: { body: string; messageId: string; token: number } | null
  templateSurface: MessagingTemplateSurface | null
  onSend: (input: { body: string; visibility: MessageVisibility; byEmail: boolean }) => Promise<Message>
  onRetry: (messageId: string) => Promise<Message>
}

export const Composer = forwardRef<ComposerHandle, ComposerProps>(function Composer(
  {
    reasonId: reasonIdProp,
    conversationId,
    channel,
    customerName,
    channelLabel,
    t,
    refusal,
    quietlyDisabled,
    noteOnly,
    emailSwitch,
    restored,
    templateSurface,
    onSend,
    onRetry,
  },
  ref,
) {
  const announce = useAnnounce()
  /* One object, so a body is never written under another conversation's id.
     Lands on Reply unless a note draft exists for this conversation (§5.x). */
  const [draft, setDraft] = useState<Draft>(() => openDraft(conversationId, noteOnly))
  const { register, body } = draft
  const setBody = (next: string | ((current: string) => string)) =>
    setDraft((current) => ({ ...current, body: typeof next === 'function' ? next(current.body) : next }))
  const setRegister = (next: MessageVisibility) =>
    setDraft((current) => ({ ...current, register: next, body: readDraft(current.id, next) }))
  const [byEmail, setByEmail] = useState(false)
  const [sending, setSending] = useState(false)
  const [rejection, setRejection] = useState<string | null>(null)
  const [restoredNotice, setRestoredNotice] = useState(false)
  const [retryOf, setRetryOf] = useState<{ messageId: string; body: string } | null>(null)
  const typingSentAt = useRef(0)
  const field = useRef<HTMLTextAreaElement | null>(null)
  const ownId = useId()
  const reasonId = reasonIdProp ?? ownId
  const consequenceId = useId()

  const note = register === 'internal'

  useEffect(() => {
    setDraft((current) => (current.id === conversationId ? current : openDraft(conversationId, noteOnly)))
    setByEmail(false)
    setRestoredNotice(false)
    setRejection(null)
    setRetryOf(null)
  }, [conversationId, noteOnly])

  useEffect(() => {
    writeDraft(draft.id, draft.register, draft.body)
  }, [draft])

  useEffect(() => {
    if (restored === null) return
    setDraft((current) => ({ ...current, register: 'customer', body: restored.body }))
    setRestoredNotice(true)
    setRetryOf({ messageId: restored.messageId, body: restored.body })
    const node = field.current
    if (node) {
      node.focus()
      node.setSelectionRange(restored.body.length, restored.body.length)
    }
  }, [restored])

  function switchRegister(next: MessageVisibility) {
    if (next === register || (noteOnly && next === 'customer')) return
    setRegister(next)
    setRejection(null)
    setRetryOf(null)
    announce(
      next === 'internal'
        ? t('inbox.composer.announce.note')
        : t('inbox.composer.announce.reply', { name: customerName }),
    )
  }

  useImperativeHandle(
    ref,
    () => ({
      focus: (next) => {
        if (next !== undefined) switchRegister(next)
        field.current?.focus()
      },
      toggleRegister: () => switchRegister(register === 'internal' ? 'customer' : 'internal'),
    }),
  )

  const empty = body.trim() === ''
  const blocked = refusal !== null || quietlyDisabled
  const sendDisabled = blocked || empty || sending

  async function send() {
    if (sendDisabled) return
    const outgoing = body
    const visibility = register
    setSending(true)
    setRejection(null)
    if (channel === 'chat' && !note) void sendTypingIndicator(conversationId, false).catch(() => undefined)
    setBody('')
    clearDraft(conversationId, visibility)
    setRestoredNotice(false)
    try {
      const retrying = retryOf !== null && retryOf.body === outgoing && visibility === 'customer'
      if (retrying) await onRetry(retryOf.messageId)
      else await onSend({ body: outgoing, visibility, byEmail })
      setRetryOf(null)
      /* Carrier 6: a posted note hands the field back to Reply. */
      if (visibility === 'internal' && !noteOnly) switchRegister('customer')
      field.current?.focus()
    } catch (error) {
      setBody(outgoing)
      setRejection(operatorSentence(error, t))
      field.current?.focus()
    } finally {
      setSending(false)
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      void send()
    }
  }

  if (channel === 'whatsapp') {
    return <p className="mx-4 mb-2 text-sm text-muted-foreground">{t('conversations.composer.whatsapp')}</p>
  }

  const describedBy = refusal ? reasonId : undefined
  const surface = note ? 'bg-note' : 'bg-card'

  return (
    <div data-inbox-composer="" className="mx-4 mb-2 flex flex-col gap-1">
      <div
        data-inbox-composer-surface=""
        className={cn(
          'relative overflow-hidden rounded-lg border border-border-control transition-colors',
          'focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
          surface,
        )}
      >
        {note && <span aria-hidden="true" className="absolute inset-y-0 start-0 w-marker bg-note-bar" />}

        {/* Carrier 1: two wide tabs on the surface's top edge. The selected one
            is fused with the body (same ground, its bottom border covers the
            track's hairline) and carries a 2px top edge, weight 600 and its
            icon; the other sits recessed on the `bg-muted` track (AC-CC-11). */}
        <Tabs
          value={register}
          onValueChange={(next) => {
            if (next === 'customer' || next === 'internal') switchRegister(next)
          }}
          className="gap-0"
        >
          <TabsList
            aria-label={t('conversations.composer.register')}
            className="h-control w-full items-stretch justify-start gap-0 rounded-none border-b border-border-control bg-muted p-0"
          >
            {!noteOnly && (
              <TabsTrigger
                value="customer"
                disabled={blocked}
                aria-describedby={describedBy}
                aria-label={t('inbox.composer.label', { name: customerName })}
                className={cn(tabClass('data-active:bg-card', 'data-active:border-b-card'), 'min-w-0')}
              >
                <SendIcon className="shrink-0" />
                <span className="shrink-0">{t('inbox.composer.tab.verb')}</span>
                <span data-inbox-tab-name="" className="min-w-0 truncate">{customerName}</span>
              </TabsTrigger>
            )}
            <TabsTrigger
              value="internal"
              disabled={blocked}
              aria-describedby={describedBy}
              className={cn(tabClass('data-active:bg-note', 'data-active:border-b-note'), 'flex-none')}
            >
              <NoteIcon className="shrink-0" />
              {t('conversations.composer.note')}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Carrier 3: the standing consequence line, always rendered. */}
        <p id={consequenceId} className="flex items-center gap-1.5 px-3 pt-2 text-xs text-muted-foreground">
          {note ? <NoteIcon className="size-3.5" /> : <SendIcon className="size-3.5" />}
          {note
            ? t('inbox.composer.consequence.note')
            : t('inbox.composer.consequence.reply', { name: customerName, channel: channelLabel })}
        </p>

        {/* Carriers 2 and 4: the field shares the surface; the placeholder names the register. */}
        <Textarea
          ref={field}
          rows={2}
          value={body}
          disabled={blocked}
          aria-describedby={[consequenceId, describedBy].filter(Boolean).join(' ')}
          aria-label={note ? t('conversations.composer.note') : t('inbox.composer.label', { name: customerName })}
          placeholder={
            blocked
              ? undefined
              : note
                ? t('inbox.composer.placeholder.note')
                : t('inbox.composer.placeholder.reply', { name: customerName })
          }
          className="min-h-16 max-h-48 resize-none rounded-none border-0 bg-transparent px-3 shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:bg-transparent"
          onChange={(event) => {
            setBody(event.target.value)
            if (channel !== 'chat' || note) return
            const at = Date.now()
            if (at - typingSentAt.current < TYPING_DEBOUNCE_MS) return
            typingSentAt.current = at
            void sendTypingIndicator(conversationId, true).catch(() => undefined)
          }}
          onKeyDown={onKeyDown}
        />

        <div className="flex h-10 items-center gap-2 px-2">
          {templateSurface !== null && (
            <TemplatePicker
              surface={templateSurface}
              reasonCode={null}
              disabled={blocked}
              variant="ghost"
              size="default"
              icon={<FileTextIcon />}
              onInsert={(text) => {
                setBody((current) => (current.trim() ? `${current}\n${text}` : text))
                field.current?.focus()
              }}
              t={t}
            />
          )}
          {emailSwitch !== null && !note && (
            <Toggle
              variant="outline"
              size="default"
              pressed={byEmail}
              disabled={blocked || emailSwitch.refusal !== null}
              aria-describedby={blocked ? describedBy : emailSwitch.refusal !== null ? `${reasonId}-email` : undefined}
              onPressedChange={setByEmail}
            >
              {t('conversations.composer.byEmail')}
            </Toggle>
          )}
          {/* Carrier 5: only a reply gets the filled button (AC-CC-09). */}
          <Button
            variant={note ? 'secondary' : 'default'}
            size="default"
            className="ms-auto"
            disabled={sendDisabled}
            aria-describedby={describedBy}
            onClick={() => void send()}
          >
            {t(note ? 'conversations.composer.addNote' : 'conversations.composer.send')}
          </Button>
        </div>
      </div>

      {/* Carrier 6: the key hint names the register. Outside the surface. */}
      <p className="text-xs text-muted-foreground">
        {note ? t('inbox.composer.keys.note') : t('inbox.composer.keys.reply', { name: customerName })}
      </p>

      {emailSwitch?.address != null && byEmail && !note && (
        <p className="text-xs text-muted-foreground">
          <bdi>{t('conversations.composer.byEmail.pressed', { address: emailSwitch.address })}</bdi>
        </p>
      )}
      {/* §8.6.8: the toggle's own reason only while the composer is live (V-5). */}
      {emailSwitch?.refusal != null && !note && !blocked && (
        <p id={`${reasonId}-email`} className="text-xs text-muted-foreground">
          {emailSwitch.refusal}
        </p>
      )}
      {refusal !== null && (
        <p id={reasonId} className="text-xs text-muted-foreground">
          {refusal}
        </p>
      )}
      {restoredNotice && <p className="text-xs text-muted-foreground">{t('conversations.composer.restored')}</p>}
      {rejection !== null && <p className="text-xs text-foreground">{rejection}</p>}
    </div>
  )
})

/** The fused tab: `ground` is the body's own, `edge` recolours the bottom border to match it. */
function tabClass(ground: string, edge: string): string {
  return cn(
    'h-auto rounded-none border-0 border-t-2 border-t-transparent ps-3 pe-3 font-medium text-muted-foreground hover:text-foreground',
    'data-active:-mb-px data-active:border-b data-active:border-t-foreground data-active:font-semibold data-active:text-foreground',
    ground,
    edge,
  )
}

interface Draft {
  id: string
  register: MessageVisibility
  body: string
}

function openDraft(conversationId: string, noteOnly: boolean): Draft {
  const register: MessageVisibility =
    noteOnly || (readDraft(conversationId, 'internal') !== '' && readDraft(conversationId, 'customer') === '')
      ? 'internal'
      : 'customer'
  return { id: conversationId, register, body: readDraft(conversationId, register) }
}

/** The rejection sentence, chosen from the error (design 11 §6). */
function operatorSentence(error: unknown, t: Translate): string {
  const status = (error as { status?: unknown } | null)?.status
  if (status === 409) return t('conversations.composer.rejected.closed')
  const kind = (error as { kind?: unknown } | null)?.kind
  if (kind === 'network') return t('conversations.composer.rejected.network')
  const message = (error as { message?: unknown } | null)?.message
  return typeof message === 'string' && message !== '' ? message : t('conversations.composer.rejected.network')
}
