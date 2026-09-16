/**
 * Password hashing for `users.password_hash` (F-V2-11): `05-backend.md` §2
 * Q1 names argon2id, but no native binding is a project dependency, so this
 * uses `node:crypto`'s scrypt (same N/r/p shape) instead. Swapping later is
 * a change to this file's two functions, not the schema or the wire. */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
) => Promise<Buffer>

const SCRYPT_N = 16384
const SCRYPT_R = 8
const SCRYPT_P = 1
const KEY_LENGTH = 64

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16)
  const derived = await scrypt(plain, salt, KEY_LENGTH, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P })
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${derived.toString('hex')}`
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  const parts = stored.split('$')
  if (parts.length !== 6 || parts[0] !== 'scrypt') return false
  const n = Number(parts[1])
  const r = Number(parts[2])
  const p = Number(parts[3])
  const salt = Buffer.from(parts[4] as string, 'hex')
  const expected = Buffer.from(parts[5] as string, 'hex')
  if (!Number.isFinite(n) || !Number.isFinite(r) || !Number.isFinite(p) || expected.length === 0) return false
  const derived = await scrypt(plain, salt, expected.length, { N: n, r, p })
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}
