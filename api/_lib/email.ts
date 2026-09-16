/**
 * Provider-agnostic email (05-backend.md §1): one adapter interface behind
 * `EMAIL_PROVIDER`, used for alerts and digests. Resend is the reference
 * implementation, matching the doc's named choice.
 */

export interface EmailMessage {
  to: string
  subject: string
  html: string
  text?: string
}

export interface EmailAdapter {
  send(message: EmailMessage): Promise<{ id: string } | void>
}

/** Logs instead of sending, so every code path that calls `send` compiles and runs before a provider is configured — the default when `EMAIL_PROVIDER` is unset. */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email:noop] to=${message.to} subject=${message.subject}`)
  }
}

interface ResendErrorBody {
  message?: string
}

/**
 * Plain HTTP call, no SDK dependency (`secrets.ts`'s "no dependency needed
 * for one call site" preference). A non-2xx throws with Resend's own error
 * message, which `alertDelivery.ts` records as the delivery's `error`
 * (AC-1284). */
export class ResendEmailAdapter implements EmailAdapter {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<{ id: string } | void> {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${this.apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        from: this.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
      }),
    })
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as ResendErrorBody
      throw new Error(body.message ?? `Resend responded ${res.status}`)
    }
    const body = (await res.json()) as { id: string }
    return { id: body.id }
  }
}

/**
 * `EMAIL_PROVIDER=resend` with both keys set selects the real adapter
 * (05-backend.md §1's env table); anything else, including unset, is the
 * no-op so every alert-delivery path still compiles and runs.
 */
export function createEmailAdapterFromEnv(): EmailAdapter {
  if (process.env.EMAIL_PROVIDER === 'resend') {
    const apiKey = process.env.EMAIL_API_KEY
    const from = process.env.EMAIL_FROM
    if (!apiKey || !from) {
      throw new Error('EMAIL_PROVIDER=resend requires EMAIL_API_KEY and EMAIL_FROM')
    }
    return new ResendEmailAdapter(apiKey, from)
  }
  return new ConsoleEmailAdapter()
}
