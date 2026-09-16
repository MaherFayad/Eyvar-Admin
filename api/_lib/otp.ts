/**
 * One-time codes (SMS second factor, password/invite tokens) and TOTP
 * (RFC 6238). `node:crypto` has everything HOTP/TOTP needs (HMAC-SHA1 over
 * a counter), so no `otplib` dependency, matching `password.ts`'s "no new
 * dependency" rule. */
import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto'

const CODE_DIGITS = 6

/** A random six-digit code, zero-padded. Never logged or returned on the wire — only its hash is stored. */
export function generateCode(): string {
  return String(randomInt(0, 10 ** CODE_DIGITS)).padStart(CODE_DIGITS, '0')
}

/** HMAC-SHA256 keyed on `SESSION_SECRET`, so a leaked `signin_challenges` row cannot be brute-forced offline any faster than the online 5-attempt lockout already allows. */
export function hashCode(code: string, secret: string): string {
  return createHmac('sha256', secret).update(code).digest('hex')
}

/** Constant-time compare, mirroring `password.ts`'s `verifyPassword`. */
export function verifyCodeHash(code: string, storedHash: string, secret: string): boolean {
  const expected = Buffer.from(hashCode(code, secret), 'hex')
  const actual = Buffer.from(storedHash, 'hex')
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

/** A random, URL-safe token for invite/reset links — 32 bytes, hex. */
export function generateToken(): string {
  return randomBytes(32).toString('hex')
}

/* ───────────────────────────── TOTP (RFC 6238) ─────────────────────────── */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const TOTP_STEP_SECONDS = 30
const TOTP_DIGITS = 6
/** One step either side of "now", so clock drift on the operator's phone does not lock them out. */
const TOTP_WINDOW_STEPS = 1

function base32Encode(buf: Buffer): string {
  let bits = ''
  for (const byte of buf) bits += byte.toString(2).padStart(8, '0')
  let out = ''
  for (let i = 0; i + 5 <= bits.length; i += 5) {
    out += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)]
  }
  const remainder = bits.length % 5
  if (remainder !== 0) {
    const last = bits.slice(bits.length - remainder).padEnd(5, '0')
    out += BASE32_ALPHABET[parseInt(last, 2)]
  }
  return out
}

function base32Decode(secret: string): Buffer {
  const clean = secret.replace(/\s|=/g, '').toUpperCase()
  let bits = ''
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) continue
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes: number[] = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

/** A fresh 160-bit secret (RFC 4226's recommended HOTP key length), base32. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20))
}

/** Grouped in fours for reading aloud — design §5.1, `font-mono` beneath the QR canvas. */
export function formatTotpSecret(secret: string): string {
  return (secret.match(/.{1,4}/g) ?? [secret]).join(' ')
}

function hotp(key: Buffer, counter: number): string {
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(counterBuf).digest()
  const offset = hmac[hmac.length - 1]! & 0xf
  const binCode =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff)
  return String(binCode % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, '0')
}

/** The current six-digit code for a base32 secret. Exported so a test can compute the expected value without duplicating the algorithm. */
export function totpAt(secret: string, atMs: number = Date.now()): string {
  const key = base32Decode(secret)
  const counter = Math.floor(atMs / 1000 / TOTP_STEP_SECONDS)
  return hotp(key, counter)
}

/** Accepts the current step and `TOTP_WINDOW_STEPS` either side of it. */
export function verifyTotp(secret: string, code: string, atMs: number = Date.now()): boolean {
  for (let step = -TOTP_WINDOW_STEPS; step <= TOTP_WINDOW_STEPS; step++) {
    if (totpAt(secret, atMs + step * TOTP_STEP_SECONDS * 1000) === code) return true
  }
  return false
}
