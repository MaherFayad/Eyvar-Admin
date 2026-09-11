/**
 * Encryption at rest for stored credentials — `05-backend.md` §1 "Secrets at
 * rest": a Slack webhook URL is a credential, encrypted with `SECRETS_KEY`
 * (AES-256-GCM) before it reaches `webhooks.url_encrypted`. `node:crypto`,
 * not a dependency — this is the one primitive Node ships that needs none.
 */

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

export interface SecretsAdapter {
  /** Returns a base64 blob: 12-byte IV, 16-byte auth tag, then ciphertext. */
  encrypt(plaintext: string): string
  decrypt(blob: string): string
}

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const TAG_LENGTH = 16

export class AesGcmSecretsAdapter implements SecretsAdapter {
  private readonly key: Buffer

  constructor(base64Key: string) {
    const key = Buffer.from(base64Key, 'base64')
    if (key.length !== 32) {
      throw new Error('SECRETS_KEY must decode to 32 bytes for AES-256-GCM')
    }
    this.key = key
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.key, iv)
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString('base64')
  }

  decrypt(blob: string): string {
    const raw = Buffer.from(blob, 'base64')
    const iv = raw.subarray(0, IV_LENGTH)
    const tag = raw.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
    const ciphertext = raw.subarray(IV_LENGTH + TAG_LENGTH)
    const decipher = createDecipheriv(ALGORITHM, this.key, iv)
    decipher.setAuthTag(tag)
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
  }
}

export function createSecretsAdapterFromEnv(): SecretsAdapter {
  const key = process.env.SECRETS_KEY
  if (!key) throw new Error('SECRETS_KEY is not set')
  return new AesGcmSecretsAdapter(key)
}
