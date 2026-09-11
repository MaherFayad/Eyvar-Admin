/**
 * Provider-agnostic email — `05-backend.md` §1: one adapter interface behind
 * `EMAIL_PROVIDER`, for alerts and digests. Only the no-op console adapter
 * exists here; a Resend adapter belongs to whichever WP first sends mail
 * (WP-6.6, alert deliveries).
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

/** Logs instead of sending, so every code path that calls `send` compiles and runs before a provider exists. */
export class ConsoleEmailAdapter implements EmailAdapter {
  async send(message: EmailMessage): Promise<void> {
    console.log(`[email:noop] to=${message.to} subject=${message.subject}`)
  }
}

/** `EMAIL_PROVIDER` will select a real adapter once one is wired; today it is always the no-op. */
export function createEmailAdapterFromEnv(): EmailAdapter {
  return new ConsoleEmailAdapter()
}
