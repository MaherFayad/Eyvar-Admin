/**
 * The full `SignInOutcome` surface (challenge, TOTP enrolment, device
 * trust, reset, activation). A domain refusal is a 200 `{ kind: 'failed' }`,
 * never a thrown error. Unlike the mock, a locked challenge's `lockedUntil`
 * is stamped once and read back as-is, not recomputed on every read. */
import type { PermissionKey } from '@/data/types/navigation'
import type { RoleName, Session } from '@/data/types/session'
import type { IsoDateTime } from '@/data/types/common'
import type {
  ReauthenticateOutcome,
  RequestPasswordResetOutcome,
  ResendCodeOutcome,
  ResetPasswordOutcome,
  SecondFactor,
  SignInOutcome,
  TokenState,
  TotpEnrolment,
  ValidateTokenOutcome,
  VerifyCodeOutcome,
  VerifyFailureReason,
} from '@/data/types/auth'
import type { ApiErrorDetail } from '../errors'
import { notFoundError, rateLimitedError, unauthorizedError, validationError } from '../errors'
import { jsonResponse } from '../envelope'
import { checkRateLimit, clientIp } from '../rateLimit'
import {
  DEVICE_TRUST_SECONDS,
  clearSessionCookieHeader,
  deviceCookieHeader,
  readDeviceCookie,
  requireSessionSecret,
  sessionCookieHeader,
  signSessionId,
  verifySessionCookieValue,
  type RequestContext,
} from '../auth'
import type { RouteHandler } from '../router'
import type { Database } from '../db'
import { hashPassword, verifyPassword } from '../password'
import {
  formatTotpSecret,
  generateCode as generateOtpCode,
  generateTotpSecret,
  generateToken,
  hashCode,
  verifyCodeHash,
  verifyTotp,
} from '../otp'
import { createEmailAdapterFromEnv } from '../email'
import { buildSessionPayload } from './session'

async function parseJsonBody(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const text = await req.text()
    if (!text) return null
    const parsed: unknown = JSON.parse(text)
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : null
  } catch {
    return null
  }
}

/** Builds a `Response` carrying more than one `Set-Cookie` — `jsonResponse`'s plain-object headers can only hold one value per name. */
function jsonWithCookies(data: unknown, cookies: string[], status = 200): Response {
  const headers = new Headers({ 'content-type': 'application/json' })
  for (const cookie of cookies) headers.append('set-cookie', cookie)
  return new Response(JSON.stringify(data), { status, headers })
}

function offsetFromNowIso(ms: number): IsoDateTime {
  return new Date(Date.now() + ms).toISOString() as IsoDateTime
}

/* ───────────────────────── policy constants ────────────────────────────
   Mirrors `src/data/fixtures/authIdentities.ts` exactly, so the real and the
   mock backend agree on every deadline and threshold a QA engineer compares. */
const CODE_LIFETIME_MINUTES = 10
const RESEND_COOLDOWN_SECONDS: readonly number[] = [30, 60, 120]
const MAX_CODES_PER_CHALLENGE = 5
const MAX_CODE_ATTEMPTS = 5
const INVALIDATE_AT_ATTEMPT = 3
const CHALLENGE_LOCKOUT_MINUTES = 15
/** `AUTH_BREACHED_PASSWORDS`, verbatim — AC-548. Not a live breach-list API; see WP-6.2b's report. */
const BREACHED_PASSWORDS: readonly string[] = ['Password123!', 'qwertyuiop123456', 'letmein-please-1']
const RESET_TOKEN_HOURS = 24
/** No fixture names this — the mock only shows a locked *state*, never a trigger. A real account lock needs one; five in a row is this backend's own policy. */
const MAX_PASSWORD_ATTEMPTS = 5
const PASSWORD_LOCKOUT_MINUTES = 15

/* ───────────────────────────── identity ─────────────────────────────── */

interface AuthUserRow {
  id: string
  email: string
  password_hash: string
  role_id: string
  status: string
  phone: string | null
  second_factor_method: 'sms' | 'totp' | null
  totp_secret: string | null
  failed_password_attempts: number
  password_locked_until: string | null
}

async function findUserByEmail(db: Database, email: string): Promise<AuthUserRow | null> {
  const rows = await db.sql<AuthUserRow>`
    SELECT id, email, password_hash, role_id, status, phone, second_factor_method, totp_secret,
           failed_password_attempts, password_locked_until
    FROM users WHERE email = ${email}
  `
  return rows[0] ?? null
}

/** Five wrong passwords in a row lock the account for `PASSWORD_LOCKOUT_MINUTES` — see the constant's comment. */
async function recordFailedPassword(db: Database, user: { id: string; failed_password_attempts: number }): Promise<void> {
  const attempts = user.failed_password_attempts + 1
  if (attempts >= MAX_PASSWORD_ATTEMPTS) {
    await db.sql`
      UPDATE users SET failed_password_attempts = 0, password_locked_until = ${offsetFromNowIso(PASSWORD_LOCKOUT_MINUTES * 60_000)}
      WHERE id = ${user.id}
    `
  } else {
    await db.sql`UPDATE users SET failed_password_attempts = ${attempts} WHERE id = ${user.id}`
  }
}

/** Baseline (`role_permissions`) union signed delta minus revoked — D17's `effectivePermissions`, against live columns rather than a fixture. */
async function resolveOperatorPermissions(db: Database, userId: string): Promise<{ roleId: string; permissions: PermissionKey[] }> {
  const rows = await db.sql<{
    role_id: string
    permission_granted: string[]
    permission_revoked: string[]
    baseline: (string | null)[]
  }>`
    SELECT u.role_id, u.permission_granted, u.permission_revoked,
           array_remove(array_agg(rp.permission_key), NULL) AS baseline
    FROM users u
    LEFT JOIN role_permissions rp ON rp.role_id = u.role_id
    WHERE u.id = ${userId}
    GROUP BY u.role_id, u.permission_granted, u.permission_revoked
  `
  const row = rows[0]
  if (!row) throw unauthorizedError()
  const baseline = row.baseline.filter((p): p is string => p !== null) as PermissionKey[]
  const revoked = new Set(row.permission_revoked)
  const permissions = baseline.filter((key) => !revoked.has(key))
  for (const key of row.permission_granted as PermissionKey[]) {
    if (!revoked.has(key) && !permissions.includes(key)) permissions.push(key)
  }
  return { roleId: row.role_id, permissions }
}

async function buildSessionFor(db: Database, userId: string): Promise<Session> {
  const { roleId, permissions } = await resolveOperatorPermissions(db, userId)
  return buildSessionPayload(db, { userId, role: roleId, permissions })
}

/* ──────────────────────── second-factor challenges ─────────────────────── */

interface ChallengeRow {
  id: string
  user_id: string
  method: 'sms' | 'totp'
  code_hash: string | null
  expires_at: string
  resend_available_at: string
  attempts_used: number
  codes_sent: number
  state: string
  locked_until: string | null
  enrol_method: 'sms' | 'totp' | null
  enrol_destination: string | null
}

function nextCooldownSeconds(resendCount: number): number {
  const last = RESEND_COOLDOWN_SECONDS[RESEND_COOLDOWN_SECONDS.length - 1] ?? 120
  return RESEND_COOLDOWN_SECONDS[resendCount] ?? last
}

/** No SMS/authenticator provider is wired — `email.ts`'s `ConsoleEmailAdapter` is this function's model. The code itself is never logged, only that one was sent. */
async function deliverCode(userId: string, method: 'sms' | 'totp'): Promise<void> {
  if (method === 'totp') return // Nothing to deliver — the operator's own authenticator app computes it.
  console.log(`[sms:noop] one-time code sent user=${userId}`)
}

interface OpenedChallenge {
  id: string
  expiresAt: IsoDateTime
  resendAvailableAt: IsoDateTime
  codesSent: number
}

/** One row per code, chained by supersession (§4.3, §5.3) — the state machine `clients/auth.ts`'s mock `Challenge` describes, against real rows instead of an in-memory array. */
async function openChallenge(
  db: Database,
  opts: {
    userId: string
    method: 'sms' | 'totp'
    generateCode: () => string
    carry?: { attemptsUsed: number; codesSent: number }
    enrol?: { method: 'sms' | 'totp'; destination: string }
  },
): Promise<OpenedChallenge> {
  const secret = requireSessionSecret()
  await db.sql`
    UPDATE signin_challenges SET state = 'superseded'
    WHERE user_id = ${opts.userId} AND state IN ('open', 'invalidated')
  `
  const codesSent = (opts.carry?.codesSent ?? 0) + 1
  const expiresAt = offsetFromNowIso(CODE_LIFETIME_MINUTES * 60_000)
  const resendAvailableAt = offsetFromNowIso(nextCooldownSeconds(codesSent - 1) * 1000)
  const code = opts.method === 'sms' ? opts.generateCode() : null
  const codeHash = code ? hashCode(code, secret) : null

  const rows = await db.sql<{ id: string }>`
    INSERT INTO signin_challenges
      (user_id, method, code_hash, expires_at, resend_available_at, attempts_used, codes_sent, enrol_method, enrol_destination)
    VALUES (
      ${opts.userId}, ${opts.method}, ${codeHash}, ${expiresAt}, ${resendAvailableAt},
      ${opts.carry?.attemptsUsed ?? 0}, ${codesSent}, ${opts.enrol?.method ?? null}, ${opts.enrol?.destination ?? null}
    )
    RETURNING id
  `
  await deliverCode(opts.userId, opts.method)
  return { id: rows[0]!.id, expiresAt, resendAvailableAt, codesSent }
}

function maskDestination(destination: string): string {
  return `••••••${destination.slice(-2)}`
}

function secondFactorHint(method: 'sms' | 'totp', phone: string | null): SecondFactor {
  return method === 'totp' ? { method, hint: 'Authenticator app' } : { method, hint: maskDestination(phone ?? '') }
}

function failVerify(
  reason: VerifyFailureReason,
  attemptsRemaining: number | null = null,
  lockedUntil: IsoDateTime | null = null,
): VerifyCodeOutcome {
  return { kind: 'failed', reason, attemptsRemaining, lockedUntil }
}

/* ──────────────────────────── sign in ─────────────────────────────────── */

/**
 * POST /api/v1/auth/sign-in  body: { email, password, rememberDevice? }
 * -> SignInOutcome { challenge | enrolment-required | failed }
 * `rememberDevice` is accepted and ignored here — a device is remembered
 * only once the second factor clears, on `verifyCode`. */
/** IP-based, not per-account: `failed_password_attempts`/`password_locked_until` already rate-limit a known account (`recordFailedPassword`); this guards the transport itself against an unauthenticated flood — an unknown or freshly-typo'd email has no account row to lock. */
const SIGN_IN_RATE_LIMIT = { windowMs: 15 * 60_000, max: 10 }

export function createSignInHandler(db: Database, generateCode: () => string = generateOtpCode): RouteHandler<RequestContext> {
  return async (req) => {
    const limit = await checkRateLimit(db, `signin:${clientIp(req)}`, SIGN_IN_RATE_LIMIT)
    if (limit.limited) throw rateLimitedError(limit.retryAfterSeconds)

    const body = await parseJsonBody(req)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!email || !password) {
      const details: ApiErrorDetail[] = []
      if (!email) details.push({ field: 'email', code: 'required', message: 'Email is required' })
      if (!password) details.push({ field: 'password', code: 'required', message: 'Password is required' })
      throw validationError(details)
    }

    const user = await findUserByEmail(db, email)
    const passwordOk = user ? await verifyPassword(password, user.password_hash) : false

    /* Unknown, invited, suspended and wrong-password are indistinguishable on the wire (§4.5). */
    if (!user || !passwordOk || user.status !== 'Active') {
      if (user && !passwordOk) await recordFailedPassword(db, user)
      return jsonResponse<SignInOutcome>({ kind: 'failed', reason: 'rejected', lockedUntil: null, retryAfter: null })
    }

    /* Checked only once the password is right, so a wrong password against a locked account leaks nothing beyond the generic rejection. */
    if (user.password_locked_until && Date.now() < Date.parse(user.password_locked_until)) {
      return jsonResponse<SignInOutcome>({
        kind: 'failed',
        reason: 'locked',
        lockedUntil: user.password_locked_until as IsoDateTime,
        retryAfter: null,
      })
    }
    await db.sql`UPDATE users SET failed_password_attempts = 0 WHERE id = ${user.id}`

    if (user.second_factor_method === null) {
      return jsonResponse<SignInOutcome>({
        kind: 'enrolment-required',
        enrolmentToken: `ENR-${user.email}`,
        methods: ['sms', 'totp'],
        profilePhone: user.phone,
      })
    }

    const challenge = await openChallenge(db, { userId: user.id, method: user.second_factor_method, generateCode })
    return jsonResponse<SignInOutcome>({
      kind: 'challenge',
      challengeId: challenge.id,
      secondFactor: secondFactorHint(user.second_factor_method, user.phone),
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    })
  }
}

/**
 * POST /api/v1/auth/verify-code
 *   body: { challengeId, code, rememberDevice? }
 *   -> VerifyCodeOutcome   { signed-in | failed }
 */
export function createVerifyCodeHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : ''
    const code = typeof body?.code === 'string' ? body.code : ''
    const rememberDevice = body?.rememberDevice === true
    if (!challengeId || !code) {
      throw validationError([{ field: !challengeId ? 'challengeId' : 'code', code: 'required', message: 'Required' }])
    }

    const rows = await db.sql<ChallengeRow>`SELECT * FROM signin_challenges WHERE id = ${challengeId}`
    const challenge = rows[0]
    if (!challenge) return jsonResponse<VerifyCodeOutcome>(failVerify('missing'))
    if (challenge.state === 'completed') return jsonResponse<VerifyCodeOutcome>(failVerify('completed-elsewhere'))
    if (challenge.state === 'superseded') return jsonResponse<VerifyCodeOutcome>(failVerify('superseded'))
    if (challenge.state === 'locked') {
      const lockedUntil = (challenge.locked_until ?? offsetFromNowIso(CHALLENGE_LOCKOUT_MINUTES * 60_000)) as IsoDateTime
      return jsonResponse<VerifyCodeOutcome>(failVerify('locked', null, lockedUntil))
    }
    /* The cancellation is enforced, not merely announced (§4.3 row 3) — refused before the digits are even compared. */
    if (challenge.state === 'invalidated') return jsonResponse<VerifyCodeOutcome>(failVerify('invalidated'))
    if (Date.now() > Date.parse(challenge.expires_at)) return jsonResponse<VerifyCodeOutcome>(failVerify('expired'))

    const secret = requireSessionSecret()
    let valid: boolean
    if (challenge.method === 'totp') {
      const userRows = await db.sql<{ totp_secret: string | null }>`SELECT totp_secret FROM users WHERE id = ${challenge.user_id}`
      const totpSecret = userRows[0]?.totp_secret ?? null
      valid = totpSecret !== null && verifyTotp(totpSecret, code)
    } else {
      valid = challenge.code_hash !== null && verifyCodeHash(code, challenge.code_hash, secret)
    }

    if (!valid) {
      const used = challenge.attempts_used + 1
      if (used >= MAX_CODE_ATTEMPTS) {
        const lockedUntil = offsetFromNowIso(CHALLENGE_LOCKOUT_MINUTES * 60_000)
        await db.sql`
          UPDATE signin_challenges SET attempts_used = ${used}, state = 'locked', locked_until = ${lockedUntil}
          WHERE id = ${challenge.id}
        `
        return jsonResponse<VerifyCodeOutcome>(failVerify('locked', 0, lockedUntil))
      }
      if (used === INVALIDATE_AT_ATTEMPT) {
        await db.sql`UPDATE signin_challenges SET attempts_used = ${used}, state = 'invalidated' WHERE id = ${challenge.id}`
        return jsonResponse<VerifyCodeOutcome>(failVerify('invalidated', MAX_CODE_ATTEMPTS - used))
      }
      await db.sql`UPDATE signin_challenges SET attempts_used = ${used} WHERE id = ${challenge.id}`
      return jsonResponse<VerifyCodeOutcome>(failVerify('incorrect', MAX_CODE_ATTEMPTS - used))
    }

    await db.sql`UPDATE signin_challenges SET state = 'completed' WHERE id = ${challenge.id}`

    /* This challenge came from `enrollSecondFactor` (or `signIn`'s enrolment path, indirectly) — completing it is what confirms the enrolment. The mock has no equivalent: its identities are read-only fixtures that cannot actually be enrolled. */
    if (challenge.enrol_method === 'sms') {
      await db.sql`UPDATE users SET second_factor_method = 'sms', phone = ${challenge.enrol_destination} WHERE id = ${challenge.user_id}`
    } else if (challenge.enrol_method === 'totp') {
      await db.sql`UPDATE users SET second_factor_method = 'totp' WHERE id = ${challenge.user_id}`
    }
    await db.sql`UPDATE users SET last_login_at = now(), failed_password_attempts = 0 WHERE id = ${challenge.user_id}`

    const sessionRows = await db.sql<{ id: string }>`
      INSERT INTO sessions (user_id, device, ip) VALUES (${challenge.user_id}, ${req.headers.get('user-agent')}, ${clientIp(req)})
      RETURNING id
    `
    const session = await buildSessionFor(db, challenge.user_id)
    const cookies = [sessionCookieHeader(signSessionId(sessionRows[0]!.id, secret))]

    if (rememberDevice) {
      const trustedUntil = offsetFromNowIso(DEVICE_TRUST_SECONDS * 1000)
      const deviceRows = await db.sql<{ id: string }>`
        INSERT INTO trusted_devices (user_id, trusted_until) VALUES (${challenge.user_id}, ${trustedUntil}) RETURNING id
      `
      cookies.push(deviceCookieHeader(signSessionId(deviceRows[0]!.id, secret)))
    }

    const outcome: VerifyCodeOutcome = { kind: 'signed-in', session }
    return jsonWithCookies(outcome, cookies)
  }
}

/**
 * POST /api/v1/auth/resend-code
 *   body: { challengeId }
 *   -> ResendCodeOutcome   { sent | cooling-down | exhausted | failed }
 */
export function createResendCodeHandler(db: Database, generateCode: () => string = generateOtpCode): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const challengeId = typeof body?.challengeId === 'string' ? body.challengeId : ''
    if (!challengeId) throw validationError([{ field: 'challengeId', code: 'required', message: 'Required' }])

    const rows = await db.sql<ChallengeRow>`SELECT * FROM signin_challenges WHERE id = ${challengeId}`
    const challenge = rows[0]
    if (!challenge) return jsonResponse<ResendCodeOutcome>({ kind: 'failed', reason: 'missing', lockedUntil: null })
    if (challenge.state === 'locked') {
      const lockedUntil = (challenge.locked_until ?? offsetFromNowIso(CHALLENGE_LOCKOUT_MINUTES * 60_000)) as IsoDateTime
      return jsonResponse<ResendCodeOutcome>({ kind: 'failed', reason: 'locked', lockedUntil })
    }
    /* AC-533 — five codes is the whole budget for one sign-in. */
    if (challenge.codes_sent >= MAX_CODES_PER_CHALLENGE) {
      return jsonResponse<ResendCodeOutcome>({ kind: 'exhausted', codesSent: challenge.codes_sent })
    }
    /* The cooldown is waived exactly where the operator has no working code (§4.3 row 3, §4.4 row 2). */
    const owedANewCode = challenge.state === 'invalidated' || Date.now() > Date.parse(challenge.expires_at)
    if (!owedANewCode && Date.now() < Date.parse(challenge.resend_available_at)) {
      return jsonResponse<ResendCodeOutcome>({
        kind: 'cooling-down',
        resendAvailableAt: challenge.resend_available_at as IsoDateTime,
      })
    }
    const next = await openChallenge(db, {
      userId: challenge.user_id,
      method: challenge.method,
      generateCode,
      carry: { attemptsUsed: challenge.attempts_used, codesSent: challenge.codes_sent },
      enrol: challenge.enrol_method ? { method: challenge.enrol_method, destination: challenge.enrol_destination ?? '' } : undefined,
    })
    return jsonResponse<ResendCodeOutcome>({
      kind: 'sent',
      challengeId: next.id,
      expiresAt: next.expiresAt,
      resendAvailableAt: next.resendAvailableAt,
      resendsRemaining: MAX_CODES_PER_CHALLENGE - next.codesSent,
    })
  }
}

/* ──────────────────────── enrolment ─────────────────────────────────── */

/**
 * POST /api/v1/auth/enroll-second-factor
 *   body: { enrolmentToken, method, destination }
 *   -> SignInOutcome   (a `challenge` — enrolment confirms with a code)
 */
export function createEnrollSecondFactorHandler(
  db: Database,
  generateCode: () => string = generateOtpCode,
): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const enrolmentToken = typeof body?.enrolmentToken === 'string' ? body.enrolmentToken : ''
    const method = body?.method === 'totp' ? 'totp' : body?.method === 'sms' ? 'sms' : null
    const destination = typeof body?.destination === 'string' ? body.destination : ''
    if (!enrolmentToken || !method || !destination) {
      throw validationError([{ field: 'method', code: 'required', message: 'enrolmentToken, method and destination are required' }])
    }

    const email = enrolmentToken.replace(/^ENR-/, '')
    const user = await findUserByEmail(db, email)
    if (!user) return jsonResponse<SignInOutcome>({ kind: 'failed', reason: 'rejected', lockedUntil: null, retryAfter: null })
    if (method === 'totp' && !user.totp_secret) {
      throw validationError([{ field: 'method', code: 'no_secret', message: 'Call /auth/totp-secret before confirming a TOTP enrolment' }])
    }

    const challenge = await openChallenge(db, { userId: user.id, method, generateCode, enrol: { method, destination } })
    return jsonResponse<SignInOutcome>({
      kind: 'challenge',
      challengeId: challenge.id,
      secondFactor: { method, hint: method === 'totp' ? 'Authenticator app' : maskDestination(destination) },
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    })
  }
}

/**
 * POST /api/v1/auth/totp-secret  body: { enrolmentToken }
 * -> TotpEnrolment { secret, otpauthUri, enrolmentToken }
 * A real RFC 6238 secret, unlike the mock's fixed literal (kept fixed there
 * only for visual-diff stability) — a shared literal secret here would be a vulnerability. */
export function createBeginTotpEnrolmentHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const enrolmentToken = typeof body?.enrolmentToken === 'string' ? body.enrolmentToken : ''
    if (!enrolmentToken) throw validationError([{ field: 'enrolmentToken', code: 'required', message: 'Required' }])

    const email = enrolmentToken.replace(/^ENR-/, '')
    const user = await findUserByEmail(db, email)
    if (!user) throw notFoundError(`enrolment token ${enrolmentToken}`)

    const secret = generateTotpSecret()
    await db.sql`UPDATE users SET totp_secret = ${secret} WHERE id = ${user.id}`
    const otpauthUri = `otpauth://totp/Eyvar:${encodeURIComponent(user.email)}?secret=${secret}&issuer=Eyvar&digits=6&period=30`
    return jsonResponse<TotpEnrolment>({ secret: formatTotpSecret(secret), otpauthUri, enrolmentToken })
  }
}

/* ─────────────────── forgot password, reset, activation ───────────────── */

async function deliverResetEmail(to: string, token: string): Promise<void> {
  const adapter = createEmailAdapterFromEnv()
  await adapter.send({ to, subject: 'Reset your Eyvar password', html: `<p>Token: ${token}</p>` })
}

/**
 * POST /api/v1/auth/request-password-reset  body: { email }
 * -> RequestPasswordResetOutcome — always `{ kind: 'accepted' }` (§6.2): a
 * reply differing for a known vs unknown address is an account-enumeration
 * oracle. The token is minted only when the address resolves. */
export function createRequestPasswordResetHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (email) {
      const user = await findUserByEmail(db, email)
      if (user) {
        const token = generateToken()
        await db.sql`
          INSERT INTO password_reset_tokens (token, user_id, expires_at)
          VALUES (${token}, ${user.id}, ${offsetFromNowIso(RESET_TOKEN_HOURS * 60 * 60_000)})
        `
        await deliverResetEmail(user.email, token)
      }
    }
    return jsonResponse<RequestPasswordResetOutcome>({ kind: 'accepted' })
  }
}

async function resolveToken(db: Database, token: string): Promise<ValidateTokenOutcome> {
  const inviteRows = await db.sql<{ email: string; expires_at: string; role_id: string }>`
    SELECT i.email, i.expires_at, u.role_id
    FROM invites i JOIN users u ON u.id = i.user_id
    WHERE i.token = ${token}
  `
  const invite = inviteRows[0]
  if (invite) {
    if (Date.now() > Date.parse(invite.expires_at)) return { state: 'expired', email: null, purpose: null, role: null }
    return { state: 'valid', email: invite.email, purpose: 'invite', role: invite.role_id as RoleName }
  }

  const resetRows = await db.sql<{ user_id: string; expires_at: string; used_at: string | null }>`
    SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token = ${token}
  `
  const reset = resetRows[0]
  if (!reset) return { state: 'unknown', email: null, purpose: null, role: null }
  if (reset.used_at) return { state: 'used', email: null, purpose: null, role: null }
  if (Date.now() > Date.parse(reset.expires_at)) return { state: 'expired', email: null, purpose: null, role: null }
  const userRows = await db.sql<{ email: string }>`SELECT email FROM users WHERE id = ${reset.user_id}`
  return { state: 'valid', email: userRows[0]?.email ?? null, purpose: 'reset', role: null }
}

/**
 * GET /api/v1/auth/reset-token/:token
 *   -> ValidateTokenOutcome   { state, email, purpose, role }
 */
export function createValidateResetTokenHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    const outcome = await resolveToken(db, ctx.params.token ?? '')
    return jsonResponse<ValidateTokenOutcome>(outcome)
  }
}

interface DeadReset {
  kind: 'failed'
  reason: Exclude<TokenState, 'valid'>
}

/** Single-use via `used_at` — a token this returns `null` for has already been spent or was never minted. */
async function checkResetTokenAlive(db: Database, token: string): Promise<DeadReset | { userId: string }> {
  const rows = await db.sql<{ user_id: string; expires_at: string; used_at: string | null }>`
    SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token = ${token}
  `
  const row = rows[0]
  if (!row) return { kind: 'failed', reason: 'unknown' }
  if (row.used_at) return { kind: 'failed', reason: 'used' }
  if (Date.now() > Date.parse(row.expires_at)) return { kind: 'failed', reason: 'expired' }
  return { userId: row.user_id }
}

/**
 * POST /api/v1/auth/reset-password
 *   body: { token, password }
 *   -> ResetPasswordOutcome
 */
export function createResetPasswordHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const token = typeof body?.token === 'string' ? body.token : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!token || !password) {
      throw validationError([{ field: !token ? 'token' : 'password', code: 'required', message: 'Required' }])
    }

    const check = await checkResetTokenAlive(db, token)
    if ('kind' in check) return jsonResponse<ResetPasswordOutcome>(check)
    /* AC-548 — checked after the token, because a dead link replaces the whole card and a breached password leaves the operator on the form. */
    if (BREACHED_PASSWORDS.includes(password)) {
      return jsonResponse<ResetPasswordOutcome>({ kind: 'failed', reason: 'breached' })
    }

    const passwordHash = await hashPassword(password)
    await db.sql`
      UPDATE users SET password_hash = ${passwordHash}, failed_password_attempts = 0, password_locked_until = NULL
      WHERE id = ${check.userId}
    `
    await db.sql`UPDATE password_reset_tokens SET used_at = now() WHERE token = ${token}`
    const revoked = await db.sql<{ id: string }>`
      UPDATE sessions SET revoked_at = now() WHERE user_id = ${check.userId} AND revoked_at IS NULL RETURNING id
    `
    return jsonResponse<ResetPasswordOutcome>({ kind: 'reset', otherSessionsEnded: revoked.length })
  }
}

/**
 * POST /api/v1/auth/activate  body: { token, password }  -> ResetPasswordOutcome
 * §6.6's `Invited -> Active` transition. The invite row is deleted on
 * success, which is what makes the token single-use: a replay resolves
 * `unknown`, same as a token nobody minted. */
export function createActivateInviteHandler(db: Database): RouteHandler<RequestContext> {
  return async (req) => {
    const body = await parseJsonBody(req)
    const token = typeof body?.token === 'string' ? body.token : ''
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!token || !password) {
      throw validationError([{ field: !token ? 'token' : 'password', code: 'required', message: 'Required' }])
    }

    const inviteRows = await db.sql<{ user_id: string; expires_at: string }>`
      SELECT user_id, expires_at FROM invites WHERE token = ${token}
    `
    const invite = inviteRows[0]
    if (!invite) return jsonResponse<ResetPasswordOutcome>({ kind: 'failed', reason: 'unknown' })
    if (Date.now() > Date.parse(invite.expires_at)) return jsonResponse<ResetPasswordOutcome>({ kind: 'failed', reason: 'expired' })
    if (BREACHED_PASSWORDS.includes(password)) return jsonResponse<ResetPasswordOutcome>({ kind: 'failed', reason: 'breached' })

    const passwordHash = await hashPassword(password)
    await db.sql`
      UPDATE users SET password_hash = ${passwordHash}, status = 'Active', last_login_at = now()
      WHERE id = ${invite.user_id}
    `
    await db.sql`DELETE FROM invites WHERE token = ${token}`
    return jsonResponse<ResetPasswordOutcome>({ kind: 'reset', otherSessionsEnded: 0 })
  }
}

/* ────────────────────────── session lifecycle ─────────────────────────── */

/**
 * POST /api/v1/auth/reauthenticate  body: { password } only (AC-567b)
 * -> ReauthenticateOutcome
 * AC-573: the device decides whether a code is owed — a trusted device
 * resumes on the password alone, an untrusted one gets the ordinary challenge. */
export function createReauthenticateHandler(
  db: Database,
  generateCode: () => string = generateOtpCode,
): RouteHandler<RequestContext> {
  return async (req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()
    const body = await parseJsonBody(req)
    const password = typeof body?.password === 'string' ? body.password : ''
    if (!password) throw validationError([{ field: 'password', code: 'required', message: 'Required' }])

    const rows = await db.sql<{ password_hash: string; second_factor_method: 'sms' | 'totp' | null; phone: string | null }>`
      SELECT password_hash, second_factor_method, phone FROM users WHERE id = ${ctx.operator.userId}
    `
    const user = rows[0]
    if (!user || !(await verifyPassword(password, user.password_hash))) {
      return jsonResponse<ReauthenticateOutcome>({ kind: 'failed', reason: 'rejected', lockedUntil: null })
    }

    const secret = requireSessionSecret()
    const deviceCookie = readDeviceCookie(req)
    const deviceId = deviceCookie ? verifySessionCookieValue(deviceCookie, secret) : null
    if (deviceId) {
      const trustRows = await db.sql<{ trusted_until: string }>`
        SELECT trusted_until FROM trusted_devices WHERE id = ${deviceId} AND user_id = ${ctx.operator.userId}
      `
      const trust = trustRows[0]
      if (trust && Date.now() < Date.parse(trust.trusted_until)) {
        return jsonResponse<ReauthenticateOutcome>({ kind: 'resumed', session: await buildSessionFor(db, ctx.operator.userId) })
      }
    }

    if (user.second_factor_method === null) {
      return jsonResponse<ReauthenticateOutcome>({ kind: 'resumed', session: await buildSessionFor(db, ctx.operator.userId) })
    }

    const challenge = await openChallenge(db, { userId: ctx.operator.userId, method: user.second_factor_method, generateCode })
    return jsonResponse<ReauthenticateOutcome>({
      kind: 'challenge',
      challengeId: challenge.id,
      secondFactor: secondFactorHint(user.second_factor_method, user.phone),
      expiresAt: challenge.expiresAt,
      resendAvailableAt: challenge.resendAvailableAt,
    })
  }
}

/** POST /api/v1/auth/sign-out -> `{ signedOut: true }`. This session only. */
export function createSignOutHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()
    await db.sql`
      UPDATE sessions SET revoked_at = now() WHERE id = ${ctx.operator.sessionId} AND revoked_at IS NULL
    `
    return jsonResponse({ signedOut: true }, 200, { 'set-cookie': clearSessionCookieHeader() })
  }
}

/** POST /api/v1/auth/sign-out-everywhere -> `{ sessionsEnded: number }`. Every OTHER session for this user (AC-576). */
export function createSignOutEverywhereHandler(db: Database): RouteHandler<RequestContext> {
  return async (_req, ctx) => {
    if (!ctx.operator) throw unauthorizedError()
    const rows = await db.sql<{ id: string }>`
      UPDATE sessions SET revoked_at = now()
      WHERE user_id = ${ctx.operator.userId} AND id <> ${ctx.operator.sessionId} AND revoked_at IS NULL
      RETURNING id
    `
    return jsonResponse({ sessionsEnded: rows.length })
  }
}
