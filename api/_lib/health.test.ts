/**
 * Proves the exported handler directly with a `Request` — no `vercel dev`
 * running here, so this is the proof `05-backend.md`'s WP-6.1 proof line
 * asks for when the CLI is unavailable (AC-1270's non-CLI half).
 */
import { describe, expect, it } from 'vitest'
import handler from '../v1/[...route]'
import type { ApiErrorBody } from './errors'
import type { Single } from './envelope'

describe('GET /api/v1/health', () => {
  it('returns the Single<T> envelope with status ok', async () => {
    const response = await handler(new Request('http://localhost/api/v1/health'))

    expect(response.status).toBe(200)
    const body = (await response.json()) as Single<{ status: string; time: string }>
    expect(body.data.status).toBe('ok')
    expect(typeof body.data.time).toBe('string')
    expect(response.headers.get('x-request-id')).toBeTruthy()
  })

  it('answers a 404 in the contract error shape for an unknown route', async () => {
    const response = await handler(new Request('http://localhost/api/v1/does-not-exist'))

    expect(response.status).toBe(404)
    const body = (await response.json()) as ApiErrorBody
    expect(body.kind).toBe('not-found')
    expect(body.requestId).toBeTruthy()
  })

  it('answers a 405 for a known path with the wrong method', async () => {
    const response = await handler(new Request('http://localhost/api/v1/health', { method: 'POST' }))

    expect(response.status).toBe(405)
    const body = (await response.json()) as ApiErrorBody
    expect(body.code).toBe('method_not_allowed')
  })
})
