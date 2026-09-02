/**
 * The subscription seam's own tests — the same four properties `seam.test.ts`
 * asserts for reads, restated for events:
 *
 *   1. a subscription is **asynchronous** — nothing is delivered inside
 *      `subscribe()`, so a screen cannot ship without a connecting state;
 *   2. it can be made to **fail**, globally and per topic, from `mockFailures`
 *      and therefore from `?mockFail=`;
 *   3. it is **deterministic** — no timer, no clock, no randomness, and two
 *      runs of the same script are identical;
 *   4. the **real driver compiles and works** against a stubbed transport,
 *      exactly as `http.ts` does against a stubbed `fetch`.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { disableMockLatency, mockFailures } from '../config'
import { isApiError } from '../types/common'
import {
  advanceRealtime,
  createSocketDriver,
  decodeEnvelope,
  drainRealtime,
  emitMockEvent,
  enqueueMockEvent,
  flushRealtime,
  pendingRealtimeCount,
  publish,
  REALTIME_OPERATIONS,
  realtimeUrl,
  resetRealtime,
  subscribe,
  topicOperation,
  type RealtimeEnvelope,
  type RealtimeSocket,
  type RealtimeSocketEventMap,
} from './realtime'

const TOPIC = 'conversation:CNV-TEST'

beforeEach(() => {
  disableMockLatency()
  mockFailures.clear()
  resetRealtime()
})

describe('1 — asynchronous, like a socket', () => {
  it('delivers nothing inside subscribe()', async () => {
    const seen: RealtimeEnvelope[] = []
    enqueueMockEvent(TOPIC, 'ping', { n: 1 })
    const off = subscribe(TOPIC, (e) => seen.push(e))
    expect(seen).toEqual([])
    await flushRealtime()
    expect(seen).toEqual([])
    advanceRealtime()
    expect(seen).toHaveLength(1)
    off()
  })

  it('reports connecting, then open, then closed', async () => {
    const statuses: string[] = []
    const off = subscribe(TOPIC, () => undefined, { onStatus: (s) => statuses.push(s) })
    expect(statuses).toEqual(['connecting'])
    await flushRealtime()
    expect(statuses).toEqual(['connecting', 'open'])
    off()
    expect(statuses).toEqual(['connecting', 'open', 'closed'])
  })

  it('unsubscribing twice is safe and stops delivery', async () => {
    const seen: RealtimeEnvelope[] = []
    const off = subscribe(TOPIC, (e) => seen.push(e))
    await flushRealtime()
    off()
    off()
    emitMockEvent(TOPIC, 'ping', { n: 1 })
    expect(seen).toEqual([])
  })

  it('delivers only to the matching topic', async () => {
    const mine: RealtimeEnvelope[] = []
    const theirs: RealtimeEnvelope[] = []
    subscribe(TOPIC, (e) => mine.push(e))
    subscribe('conversations:queue', (e) => theirs.push(e))
    await flushRealtime()
    emitMockEvent(TOPIC, 'ping', { n: 1 })
    expect(mine).toHaveLength(1)
    expect(theirs).toHaveLength(0)
  })
})

describe('2 — failure is injectable', () => {
  it('fails every subscription through realtime.subscribe', async () => {
    mockFailures.always(REALTIME_OPERATIONS.subscribe)
    const errors: unknown[] = []
    const statuses: string[] = []
    subscribe(TOPIC, () => undefined, {
      onError: (e) => errors.push(e),
      onStatus: (s) => statuses.push(s),
    })
    await flushRealtime()
    expect(errors).toHaveLength(1)
    expect(isApiError(errors[0])).toBe(true)
    expect(statuses).toEqual(['connecting', 'error'])
  })

  it('fails one topic without touching the others — ?mockFail=realtime.subscribe:<topic>', async () => {
    mockFailures.always(topicOperation(TOPIC))
    const failed: unknown[] = []
    const other: RealtimeEnvelope[] = []
    subscribe(TOPIC, () => undefined, { onError: (e) => failed.push(e) })
    subscribe('presence:agents', (e) => other.push(e))
    await flushRealtime()
    expect(failed).toHaveLength(1)
    emitMockEvent('presence:agents', 'presence', {})
    expect(other).toHaveLength(1)
  })

  it('a failed subscription delivers no events at all', async () => {
    mockFailures.always(REALTIME_OPERATIONS.subscribe)
    const seen: RealtimeEnvelope[] = []
    subscribe(TOPIC, (e) => seen.push(e), { onError: () => undefined })
    await flushRealtime()
    emitMockEvent(TOPIC, 'ping', {})
    expect(seen).toEqual([])
  })

  it('rejects a publish, with an ApiError like every other write', async () => {
    mockFailures.always(REALTIME_OPERATIONS.publish)
    await expect(publish(TOPIC, 'typing', {})).rejects.toSatisfy(isApiError)
    mockFailures.clear(REALTIME_OPERATIONS.publish)
    await expect(publish(TOPIC, 'typing', {})).resolves.toBeUndefined()
  })

  it('registers its operation ids so a QA panel can list them', async () => {
    const { knownOperations } = await import('../config')
    subscribe(TOPIC, () => undefined)
    await publish(TOPIC, 'typing', {})
    expect(knownOperations()).toContain(REALTIME_OPERATIONS.subscribe)
    expect(knownOperations()).toContain(REALTIME_OPERATIONS.publish)
    expect(knownOperations()).toContain(topicOperation(TOPIC))
  })
})

describe('3 — deterministic', () => {
  it('numbers events per topic from 1, and resets', async () => {
    const seen: RealtimeEnvelope[] = []
    subscribe(TOPIC, (e) => seen.push(e))
    await flushRealtime()
    emitMockEvent(TOPIC, 'a', {})
    emitMockEvent(TOPIC, 'b', {})
    expect(seen.map((e) => e.seq)).toEqual([1, 2])

    resetRealtime()
    const again: RealtimeEnvelope[] = []
    subscribe(TOPIC, (e) => again.push(e))
    await flushRealtime()
    emitMockEvent(TOPIC, 'a', {})
    emitMockEvent(TOPIC, 'b', {})
    expect(again.map((e) => e.seq)).toEqual([1, 2])
    expect(again.map((e) => e.at)).toEqual(seen.map((e) => e.at))
  })

  it('stamps the fixed clock, not the host clock', async () => {
    const seen: RealtimeEnvelope[] = []
    subscribe(TOPIC, (e) => seen.push(e))
    await flushRealtime()
    emitMockEvent(TOPIC, 'a', {})
    expect(seen[0]?.at).toBe('2026-06-25T09:14:00+03:00')
  })

  it('advances the script only when asked — there is no interval in src/data', async () => {
    const spy = vi.spyOn(globalThis, 'setInterval')
    const seen: RealtimeEnvelope[] = []
    subscribe(TOPIC, (e) => seen.push(e))
    await flushRealtime()
    enqueueMockEvent(TOPIC, 'a', {})
    enqueueMockEvent(TOPIC, 'b', {})
    enqueueMockEvent(TOPIC, 'c', {})
    expect(pendingRealtimeCount()).toBe(3)
    expect(seen).toHaveLength(0)

    expect(advanceRealtime()).toBe(1)
    expect(seen).toHaveLength(1)
    expect(drainRealtime()).toBe(2)
    expect(seen.map((e) => e.type)).toEqual(['a', 'b', 'c'])
    expect(advanceRealtime()).toBe(0)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('does not tell a late subscriber it missed what it was never entitled to', async () => {
    emitMockEvent(TOPIC, 'a', {})
    emitMockEvent(TOPIC, 'b', {})
    const gaps: unknown[] = []
    subscribe(TOPIC, () => undefined, { onGap: (g) => gaps.push(g) })
    await flushRealtime()
    emitMockEvent(TOPIC, 'c', {})
    expect(gaps).toEqual([])
  })
})

/* ─────────────────────── 4 — the real driver ────────────────────────── */

interface Listener {
  type: string
  fn: (event: unknown) => void
}

class StubSocket implements RealtimeSocket {
  sent: string[] = []
  closed = false
  private listeners: Listener[] = []

  send(data: string): void {
    this.sent.push(data)
  }

  close(): void {
    this.closed = true
  }

  addEventListener<K extends keyof RealtimeSocketEventMap>(
    type: K,
    listener: (event: RealtimeSocketEventMap[K]) => void,
  ): void {
    this.listeners.push({ type, fn: listener as (event: unknown) => void })
  }

  removeEventListener<K extends keyof RealtimeSocketEventMap>(
    type: K,
    listener: (event: RealtimeSocketEventMap[K]) => void,
  ): void {
    this.listeners = this.listeners.filter((l) => !(l.type === type && l.fn === listener))
  }

  /** Test-side: pretend the server did something. */
  fire(type: keyof RealtimeSocketEventMap, event: unknown = {}): void {
    for (const l of this.listeners) if (l.type === type) l.fn(event)
  }

  frame(payload: unknown): void {
    this.fire('message', { data: JSON.stringify(payload) })
  }

  /** Every `op` frame this socket was sent, parsed. */
  frames(): Array<Record<string, unknown>> {
    return this.sent.map((s) => JSON.parse(s) as Record<string, unknown>)
  }
}

describe('4 — the socket driver, against a stubbed transport', () => {
  it('opens one connection and multiplexes topics over it', () => {
    const sockets: StubSocket[] = []
    const driver = createSocketDriver({
      url: 'wss://example.test/api/v1/realtime',
      socketFactory: () => {
        const s = new StubSocket()
        sockets.push(s)
        return s
      },
    })

    driver.subscribe('conversations:queue', () => undefined, {})
    driver.subscribe('conversation:CNV-102', () => undefined, {})
    expect(sockets).toHaveLength(1)

    const socket = sockets[0]!
    socket.fire('open')
    const subscribeFrames = socket.frames().filter((f) => f['op'] === 'subscribe')
    expect(subscribeFrames.at(-1)?.['topics']).toEqual(['conversations:queue', 'conversation:CNV-102'])
  })

  it('decodes a server frame into the envelope every handler reads', () => {
    const socket = new StubSocket()
    const driver = createSocketDriver({ url: 'wss://x/y', socketFactory: () => socket })
    const seen: RealtimeEnvelope[] = []
    driver.subscribe(TOPIC, (e) => seen.push(e), {})
    socket.fire('open')
    socket.frame({ topic: TOPIC, type: 'message.created', seq: 1, at: '2026-06-25T09:14:00+03:00', payload: { a: 1 } })
    expect(seen).toHaveLength(1)
    expect(seen[0]?.type).toBe('message.created')
    expect(seen[0]?.payload).toEqual({ a: 1 })
  })

  it('calls onGap when the sequence jumps — the signal to refetch', () => {
    const socket = new StubSocket()
    const driver = createSocketDriver({ url: 'wss://x/y', socketFactory: () => socket })
    const gaps: Array<{ expected: number; received: number }> = []
    driver.subscribe(TOPIC, () => undefined, { onGap: (g) => gaps.push(g) })
    socket.fire('open')
    socket.frame({ topic: TOPIC, type: 'a', seq: 1, at: 'x', payload: {} })
    socket.frame({ topic: TOPIC, type: 'b', seq: 5, at: 'x', payload: {} })
    expect(gaps).toEqual([{ topic: TOPIC, expected: 2, received: 5 }])
  })

  it('sends the last seen seq back on resubscribe, so a server that can replay does', () => {
    const socket = new StubSocket()
    const driver = createSocketDriver({ url: 'wss://x/y', socketFactory: () => socket })
    driver.subscribe(TOPIC, () => undefined, {})
    socket.fire('open')
    socket.frame({ topic: TOPIC, type: 'a', seq: 7, at: 'x', payload: {} })
    driver.subscribe('presence:agents', () => undefined, {})
    const last = socket.frames().filter((f) => f['op'] === 'subscribe').at(-1)
    expect(last?.['since']).toEqual({ [TOPIC]: 7 })
  })

  it('drops a malformed frame instead of taking the console down', () => {
    const socket = new StubSocket()
    const driver = createSocketDriver({ url: 'wss://x/y', socketFactory: () => socket })
    const seen: RealtimeEnvelope[] = []
    driver.subscribe(TOPIC, (e) => seen.push(e), {})
    socket.fire('open')
    socket.fire('message', { data: 'not json' })
    socket.fire('message', { data: JSON.stringify({ topic: TOPIC }) })
    socket.frame({ topic: TOPIC, type: 'a', seq: 1, at: 'x', payload: {} })
    expect(seen).toHaveLength(1)
  })

  it('reports an ApiError and reconnects on a fixed backoff', async () => {
    const sockets: StubSocket[] = []
    const driver = createSocketDriver({
      url: 'wss://x/y',
      backoffMs: [0],
      socketFactory: () => {
        const s = new StubSocket()
        sockets.push(s)
        return s
      },
    })
    const errors: unknown[] = []
    driver.subscribe(TOPIC, () => undefined, { onError: (e) => errors.push(e) })
    sockets[0]!.fire('open')
    sockets[0]!.fire('close', {})
    expect(errors).toHaveLength(1)
    expect(isApiError(errors[0])).toBe(true)
    await new Promise((resolve) => setTimeout(resolve, 1))
    expect(sockets).toHaveLength(2)
  })

  it('closes the connection when the last subscriber leaves', () => {
    const socket = new StubSocket()
    const driver = createSocketDriver({ url: 'wss://x/y', socketFactory: () => socket })
    const off = driver.subscribe(TOPIC, () => undefined, {})
    socket.fire('open')
    off()
    expect(socket.frames().some((f) => f['op'] === 'unsubscribe')).toBe(true)
    expect(socket.closed).toBe(true)
  })

  it('refuses to publish with no connection, as an ApiError', async () => {
    const driver = createSocketDriver({
      url: 'wss://x/y',
      socketFactory: () => new StubSocket(),
    })
    await expect(driver.publish(TOPIC, 'typing', {})).rejects.toSatisfy(isApiError)
  })
})

describe('the wire format', () => {
  it('rejects anything missing a field the envelope promises', () => {
    expect(decodeEnvelope('nonsense')).toBeNull()
    expect(decodeEnvelope(JSON.stringify({ type: 'a', seq: 1, at: 'x' }))).toBeNull()
    expect(decodeEnvelope(JSON.stringify({ topic: 't', seq: 1, at: 'x' }))).toBeNull()
    expect(decodeEnvelope(JSON.stringify({ topic: 't', type: 'a', at: 'x' }))).toBeNull()
    expect(decodeEnvelope(JSON.stringify({ topic: 't', type: 'a', seq: 1 }))).toBeNull()
    expect(decodeEnvelope(JSON.stringify({ topic: 't', type: 'a', seq: 1, at: 'x' }))).toEqual({
      topic: 't',
      type: 'a',
      seq: 1,
      at: 'x',
      payload: undefined,
    })
  })

  it('builds the ws url from the same base and version every read uses', () => {
    expect(realtimeUrl('https://api.eyvar.test')).toBe('wss://api.eyvar.test/api/v1/realtime')
    expect(realtimeUrl('http://localhost:3000')).toBe('ws://localhost:3000/api/v1/realtime')
  })
})
