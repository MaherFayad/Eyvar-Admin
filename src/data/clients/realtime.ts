/**
 * The **subscription seam** — P5-T2.
 *
 * `http.ts` is the request seam: one place that knows how a read reaches a
 * server, so no screen does. This is its sibling for the other direction —
 * one place that knows how an event reaches a screen, so no screen opens a
 * socket, polls, or invents a message format.
 *
 * Same three invariants as `http.ts`, for the same reasons:
 *
 *   1. **It fails with `ApiError` and nothing else** — the same type every read
 *      throws, so an error branch does not change when `DATA_SOURCE` flips.
 *   2. **One wire format, in one place.** The envelope below is a **proposal to
 *      whoever builds the API**, exactly as `toSearchParams` is a proposal for
 *      the query string. If the server disagrees, `decodeEnvelope` is the only
 *      thing that changes.
 *   3. **Typed and wired, pointed at nothing.** `createSocketDriver` compiles,
 *      is unit-tested against a stubbed transport, and needs no component
 *      change on the day a URL exists.
 *
 * ## The wire format proposal
 *
 * One connection, many topics, one envelope shape:
 *
 * ```jsonc
 * // client → server, on open and on every subscribe
 * { "op": "subscribe",   "topics": ["conversations:queue", "conversation:CNV-102"],
 *   "since": { "conversation:CNV-102": 41 } }
 * { "op": "unsubscribe", "topics": ["conversation:CNV-102"] }
 * { "op": "publish",     "topic": "conversation:CNV-102",
 *   "type": "typing", "payload": { … } }
 *
 * // server → client
 * { "topic": "conversation:CNV-102",
 *   "type":  "message.created",     // mirrors payload.type
 *   "seq":   42,                    // monotonic *per topic*, from 1
 *   "at":    "2026-06-25T09:14:00+03:00",
 *   "payload": { … } }
 * ```
 *
 * **`seq` is the load-bearing field.** A client that reconnects and sees `seq`
 * jump from 41 to 47 has missed five events and its screen is now lying; it
 * calls `onGap` and refetches. Without a per-topic sequence, a dropped
 * websocket frame is invisible and the operator reads a stale thread. `since`
 * is the same number sent back, so a server that can replay does, and one that
 * cannot still tells the client to refetch.
 *
 * ## Topic grammar
 *
 * `<resource>:<scope>` — colon-separated, lower-case, no spaces:
 *
 *   `conversations:queue`      every unassigned conversation, for the queue
 *   `conversation:CNV-102`     one thread — messages, delivery, typing, claim
 *   `presence:agents`          operator availability
 *   `dispatch:monitor`         P8-T3's live board, when it gets one
 *
 * Wildcards are deliberately **not** in the grammar. A `conversation:*` topic
 * is a permission decision (Q4, still open) wearing a subscription's clothes.
 */

import { API_BASE_URL, API_VERSION, DATA_SOURCE, getMockLatency, mockFailures, registerOperations } from '../config'
import { EYVAR_NOW } from '../mock/clock'
import { ApiError, type IsoDateTime } from '../types/common'

export const REALTIME_OPERATIONS = {
  subscribe: 'realtime.subscribe',
  publish: 'realtime.publish',
} as const

/* ────────────────────────── the contract ────────────────────────────── */

/** `<resource>:<scope>`. A plain string so a new topic needs no edit here. */
export type RealtimeTopic = string

export interface RealtimeEnvelope<T = unknown> {
  topic: RealtimeTopic
  /** Mirrors `payload.type` for handlers that switch before narrowing. */
  type: string
  /** Monotonic per topic, from 1. A gap means events were missed — refetch. */
  seq: number
  at: IsoDateTime
  payload: T
}

/**
 * The four states a subscription can be in. `error` is **not** terminal: the
 * socket driver reconnects and the same subscription goes back to `open`.
 */
export type RealtimeStatus = 'connecting' | 'open' | 'closed' | 'error'

export type RealtimeHandler<T = unknown> = (event: RealtimeEnvelope<T>) => void

export interface RealtimeGap {
  topic: RealtimeTopic
  expected: number
  received: number
}

export interface SubscribeOptions {
  /**
   * The subscription could not be established, or dropped in a way the driver
   * will not recover from. **An `ApiError`, like every read**, so an ErrorState
   * renders it with the same branch.
   */
  onError?: (error: ApiError) => void
  onStatus?: (status: RealtimeStatus) => void
  /**
   * Events were missed. The **only** correct response is to refetch the
   * resource; the handler cannot patch a hole it never saw.
   */
  onGap?: (gap: RealtimeGap) => void
}

/** Calling it twice is safe and is the second call is a no-op. */
export type Unsubscribe = () => void

/** What a driver must do. Both implementations below satisfy it; nothing else needs to. */
export interface RealtimeDriver {
  subscribe<T>(topic: RealtimeTopic, handler: RealtimeHandler<T>, options: SubscribeOptions): Unsubscribe
  publish(topic: RealtimeTopic, type: string, payload: unknown): Promise<void>
}

/* ────────────────────────── the public seam ─────────────────────────── */

/**
 * Listen to `topic` until the returned function is called.
 *
 * ```ts
 * useEffect(() => subscribe(`conversation:${id}`, onEvent, { onGap: refetch }), [id])
 * ```
 *
 * Deliberately **synchronous-returning**: a React effect must be able to hand
 * back the teardown without awaiting. Failure therefore arrives at `onError`
 * rather than as a rejection — which is also how a websocket behaves.
 */
export function subscribe<T = unknown>(
  topic: RealtimeTopic,
  handler: RealtimeHandler<T>,
  options: SubscribeOptions = {},
): Unsubscribe {
  registerOperations(REALTIME_OPERATIONS.subscribe, topicOperation(topic))
  return driver().subscribe(topic, handler, options)
}

/**
 * Send something up the same pipe — a typing indicator, a read receipt, a
 * presence change. Async and rejecting, because unlike `subscribe` the caller
 * is issuing a command and can be told it failed.
 */
export async function publish(topic: RealtimeTopic, type: string, payload: unknown): Promise<void> {
  registerOperations(REALTIME_OPERATIONS.publish)
  return driver().publish(topic, type, payload)
}

/** `realtime.subscribe:conversation:CNV-102` — so QA can fail **one** topic. */
export function topicOperation(topic: RealtimeTopic): string {
  return `${REALTIME_OPERATIONS.subscribe}:${topic}`
}

let activeDriver: RealtimeDriver | null = null

function driver(): RealtimeDriver {
  activeDriver ??= DATA_SOURCE === 'http' ? createSocketDriver() : mockDriver
  return activeDriver
}

/**
 * Point the seam at a different driver. Two callers only: `resetRealtime` and a
 * unit test handing in a stub. Not a runtime switch — `DATA_SOURCE` is a
 * `const` for the reason `config.ts` gives, and this does not reopen it.
 */
export function setRealtimeDriver(next: RealtimeDriver | null): void {
  activeDriver = next
}

/* ─────────────────────────── the mock driver ────────────────────────── */

interface MockSubscription<T = unknown> {
  topic: RealtimeTopic
  handler: RealtimeHandler<T>
  options: SubscribeOptions
  /** Last `seq` this subscriber saw, for gap detection on replay. */
  lastSeq: number
  closed: boolean
}

const subscriptions = new Set<MockSubscription>()
const sequences = new Map<RealtimeTopic, number>()

/** Events waiting for `advanceRealtime()`. FIFO, and the order **is** the script. */
const pending: RealtimeEnvelope[] = []

/**
 * **Determinism, in one paragraph.**
 *
 * There is no `Date.now()`, no `Math.random()` and — by default — **no timer**
 * in this driver. Timestamps come from the fixed clock in `mock/clock.ts`;
 * `seq` is a seeded per-topic counter that `resetRealtime()` returns to zero;
 * and scripted events are delivered only when something calls
 * `advanceRealtime()`. Two runs of the same script produce byte-identical
 * output, which is the whole reason a visual regression can diff a chat.
 *
 * `advanceRealtime` is what P5-T2's *"a mock driven by `useTick`"* means in a
 * layer that must not import React: the console calls it from its `useTick`
 * bucket, a test calls it directly, and a QA devtool calls it from a button.
 * `src/data/` never owns an interval.
 */
export function advanceRealtime(steps = 1): number {
  let delivered = 0
  for (let i = 0; i < steps; i += 1) {
    const next = pending.shift()
    if (!next) break
    dispatch(next)
    delivered += 1
  }
  return delivered
}

/** How many scripted events are still waiting. For a devtool and for assertions. */
export function pendingRealtimeCount(): number {
  return pending.length
}

/** Deliver everything the script has left. */
export function drainRealtime(): number {
  return advanceRealtime(pending.length)
}

/**
 * Queue an event for a later `advanceRealtime()`. Used by mock clients to
 * script a delivery lifecycle — `queued` now, `sent` on the next tick,
 * `delivered` on the one after — which is what makes the four delivery states
 * reachable in a running app rather than only in a fixture.
 */
export function enqueueMockEvent<T>(topic: RealtimeTopic, type: string, payload: T, at: IsoDateTime = EYVAR_NOW): void {
  pending.push(nextEnvelope(topic, type, payload, at))
}

/**
 * Deliver an event **now**, to everyone already listening. Used by mock
 * mutations for the local echo a server would send back — claiming a
 * conversation must move it out of somebody else's queue immediately, not on
 * the next tick.
 */
export function emitMockEvent<T>(topic: RealtimeTopic, type: string, payload: T, at: IsoDateTime = EYVAR_NOW): void {
  dispatch(nextEnvelope(topic, type, payload, at))
}

function nextEnvelope<T>(topic: RealtimeTopic, type: string, payload: T, at: IsoDateTime): RealtimeEnvelope<T> {
  const seq = (sequences.get(topic) ?? 0) + 1
  sequences.set(topic, seq)
  return { topic, type, seq, at, payload }
}

function dispatch(envelope: RealtimeEnvelope): void {
  for (const sub of subscriptions) {
    if (sub.closed || sub.topic !== envelope.topic) continue
    if (sub.lastSeq > 0 && envelope.seq > sub.lastSeq + 1) {
      sub.options.onGap?.({ topic: sub.topic, expected: sub.lastSeq + 1, received: envelope.seq })
    }
    sub.lastSeq = envelope.seq
    sub.handler(envelope)
  }
}

const mockDriver: RealtimeDriver = {
  subscribe<T>(topic: RealtimeTopic, handler: RealtimeHandler<T>, options: SubscribeOptions): Unsubscribe {
    const sub: MockSubscription = {
      topic,
      handler: handler as RealtimeHandler,
      options,
      /* Start from whatever the topic has already emitted, so a late
         subscriber is not told it missed the events it was never entitled to. */
      lastSeq: sequences.get(topic) ?? 0,
      closed: false,
    }
    options.onStatus?.('connecting')

    /**
     * Failure lands on the **next microtask**, never inside `subscribe`. A
     * socket that failed before the caller held its own teardown function
     * would be untestable and would leak a subscription on every retry.
     *
     * Two ids are consulted, so QA can break the whole seam or one topic:
     *   `?mockFail=realtime.subscribe`
     *   `?mockFail=realtime.subscribe:conversation:CNV-102`
     */
    queueMicrotask(() => {
      if (sub.closed) return
      const injected = mockFailures.take(topicOperation(topic)) ?? mockFailures.take(REALTIME_OPERATIONS.subscribe)
      if (injected) {
        sub.closed = true
        subscriptions.delete(sub)
        options.onStatus?.('error')
        options.onError?.(injected)
        return
      }
      subscriptions.add(sub)
      options.onStatus?.('open')
    })

    return () => {
      if (sub.closed) return
      sub.closed = true
      subscriptions.delete(sub)
      options.onStatus?.('closed')
    }
  },

  async publish(topic: RealtimeTopic, type: string, payload: unknown): Promise<void> {
    registerOperations(REALTIME_OPERATIONS.publish)
    /* Latency, then failure — the order `mock/delay.ts` fixes and explains. */
    const ms = getMockLatency()
    if (ms > 0) await new Promise<void>((resolve) => setTimeout(resolve, ms))
    const injected = mockFailures.take(REALTIME_OPERATIONS.publish)
    if (injected) throw injected
    /* A real server echoes a publish back to every subscriber including the
       sender, so a second console tab sees the typing indicator too. */
    emitMockEvent(topic, type, payload)
  },
}

/**
 * Await anything the mock driver queued on the microtask queue — the `open`
 * status and any injected failure. One `await flushRealtime()` after
 * `subscribe()` and the subscription is settled.
 */
export async function flushRealtime(): Promise<void> {
  await Promise.resolve()
  await Promise.resolve()
}

/**
 * Forget every subscriber, every sequence and every scripted event, and put the
 * driver back to the one `DATA_SOURCE` picks. Call in `beforeEach`, alongside
 * `resetDataLayer()`.
 *
 * Resetting the **sequences** matters as much as the subscribers: a suite that
 * cleared listeners but kept counters would see `seq: 1` in its first test and
 * `seq: 9` in its ninth, which is exactly the per-run drift this driver exists
 * to avoid.
 */
export function resetRealtime(): void {
  for (const sub of subscriptions) sub.closed = true
  subscriptions.clear()
  sequences.clear()
  pending.length = 0
  activeDriver = null
}

/* ─────────────────────────── the real driver ────────────────────────── */

/**
 * The minimum a transport must do. Narrower than `WebSocket` on purpose: a
 * unit test stubs four methods, and `createSocketDriver` never touches a DOM
 * global directly.
 */
export interface RealtimeSocket {
  send(data: string): void
  close(): void
  addEventListener<K extends keyof RealtimeSocketEventMap>(
    type: K,
    listener: (event: RealtimeSocketEventMap[K]) => void,
  ): void
  removeEventListener<K extends keyof RealtimeSocketEventMap>(
    type: K,
    listener: (event: RealtimeSocketEventMap[K]) => void,
  ): void
}

export interface RealtimeSocketEventMap {
  open: unknown
  message: { data: string }
  error: unknown
  close: { code?: number; reason?: string }
}

export type RealtimeSocketFactory = (url: string) => RealtimeSocket

/** `wss://host/api/v1/realtime` — same base and version every read uses, so one env var moves both. */
export function realtimeUrl(base: string = API_BASE_URL): string {
  if (!base) {
    if (typeof window === 'undefined') return `/api/${API_VERSION}/realtime`
    const scheme = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${scheme}//${window.location.host}/api/${API_VERSION}/realtime`
  }
  return `${base.replace(/^http/, 'ws')}/api/${API_VERSION}/realtime`
}

const defaultSocketFactory: RealtimeSocketFactory = (url) => {
  const ws = new WebSocket(url)
  return {
    send: (data) => ws.send(data),
    close: () => ws.close(),
    addEventListener: (type, listener) => ws.addEventListener(type, listener as EventListener),
    removeEventListener: (type, listener) => ws.removeEventListener(type, listener as EventListener),
  }
}

/**
 * **Fixed** backoff, in milliseconds. No jitter — not as an oversight but
 * because `Math.random()` is forbidden in this directory and a jittered
 * reconnect cannot be asserted. A real deployment with thousands of consoles
 * wants jitter; it belongs in the server's `Retry-After`, which this honours by
 * reading `reconnectAfterMs` off a `close` payload once the API defines one.
 */
const RECONNECT_BACKOFF_MS = [1_000, 2_000, 5_000, 10_000, 30_000] as const

export interface SocketDriverOptions {
  url?: string
  socketFactory?: RealtimeSocketFactory
  /** Set to `0` in a unit test to reconnect on the next macrotask. */
  backoffMs?: readonly number[]
}

/**
 * One connection, multiplexed over every topic the app is watching.
 *
 * Not one socket per subscription: a conversation console watches the queue,
 * the open thread and presence at once, and three sockets is three
 * authentications, three reconnect storms and three places to leak.
 *
 * **Pointed at nothing today.** `realtimeUrl()` resolves against
 * `VITE_API_BASE_URL`, which is empty, and `DATA_SOURCE` is `mock`, so this
 * code path is only ever entered by `realtime.test.ts` with a stubbed factory.
 * That is the same posture `http.ts` has had since it was written.
 */
export function createSocketDriver(options: SocketDriverOptions = {}): RealtimeDriver {
  const factory = options.socketFactory ?? defaultSocketFactory
  const url = options.url ?? realtimeUrl()
  const backoff = options.backoffMs ?? RECONNECT_BACKOFF_MS

  const subs = new Set<MockSubscription>()
  let socket: RealtimeSocket | null = null
  let attempt = 0
  let closedByUs = false
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null

  const statusAll = (status: RealtimeStatus) => {
    for (const sub of subs) sub.options.onStatus?.(status)
  }

  function sendSubscribeFrame(): void {
    if (!socket || subs.size === 0) return
    const since: Record<string, number> = {}
    const topics = new Set<string>()
    for (const sub of subs) {
      topics.add(sub.topic)
      /* The furthest any subscriber on this topic got, so a replay does not
         re-deliver what one of them already handled. */
      if (sub.lastSeq > (since[sub.topic] ?? 0)) since[sub.topic] = sub.lastSeq
    }
    socket.send(JSON.stringify({ op: 'subscribe', topics: [...topics], since }))
  }

  function connect(): void {
    if (socket || closedByUs) return
    statusAll('connecting')
    let next: RealtimeSocket
    try {
      next = factory(url)
    } catch {
      scheduleReconnect(transportError('Could not open a realtime connection'))
      return
    }
    socket = next

    next.addEventListener('open', () => {
      attempt = 0
      sendSubscribeFrame()
      statusAll('open')
    })

    next.addEventListener('message', (event) => {
      const envelope = decodeEnvelope(event.data)
      if (!envelope) return
      for (const sub of subs) {
        if (sub.topic !== envelope.topic) continue
        if (sub.lastSeq > 0 && envelope.seq > sub.lastSeq + 1) {
          sub.options.onGap?.({ topic: sub.topic, expected: sub.lastSeq + 1, received: envelope.seq })
        }
        sub.lastSeq = envelope.seq
        sub.handler(envelope)
      }
    })

    next.addEventListener('error', () => {
      scheduleReconnect(transportError('The realtime connection failed'))
    })

    next.addEventListener('close', () => {
      if (closedByUs) return
      scheduleReconnect(transportError('The realtime connection closed'))
    })
  }

  function scheduleReconnect(error: ApiError): void {
    socket = null
    statusAll('error')
    for (const sub of subs) sub.options.onError?.(error)
    if (closedByUs || subs.size === 0 || reconnectTimer !== null) return
    const waitMs = backoff[Math.min(attempt, backoff.length - 1)] ?? 0
    attempt += 1
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, waitMs)
  }

  return {
    subscribe<T>(topic: RealtimeTopic, handler: RealtimeHandler<T>, opts: SubscribeOptions): Unsubscribe {
      const sub: MockSubscription = {
        topic,
        handler: handler as RealtimeHandler,
        options: opts,
        lastSeq: 0,
        closed: false,
      }
      subs.add(sub)
      closedByUs = false
      if (socket) sendSubscribeFrame()
      else connect()

      return () => {
        if (sub.closed) return
        sub.closed = true
        subs.delete(sub)
        opts.onStatus?.('closed')
        const stillWanted = [...subs].some((s) => s.topic === topic)
        if (!stillWanted) socket?.send(JSON.stringify({ op: 'unsubscribe', topics: [topic] }))
        if (subs.size === 0) {
          closedByUs = true
          if (reconnectTimer !== null) {
            clearTimeout(reconnectTimer)
            reconnectTimer = null
          }
          socket?.close()
          socket = null
        }
      }
    },

    async publish(topic: RealtimeTopic, type: string, payload: unknown): Promise<void> {
      if (!socket) throw transportError('Not connected')
      socket.send(JSON.stringify({ op: 'publish', topic, type, payload }))
    },
  }
}

/**
 * Frame → envelope, or `null` for anything malformed.
 *
 * **Malformed frames are dropped, not thrown.** A single bad frame must not
 * take down a console that is otherwise working; a *stream* of them shows up as
 * a `seq` gap, which is the signal that already means "refetch".
 */
export function decodeEnvelope(raw: unknown): RealtimeEnvelope | null {
  if (typeof raw !== 'string') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== 'object' || parsed === null) return null
  const candidate = parsed as Partial<RealtimeEnvelope>
  if (typeof candidate.topic !== 'string') return null
  if (typeof candidate.type !== 'string') return null
  if (typeof candidate.seq !== 'number' || !Number.isFinite(candidate.seq)) return null
  if (typeof candidate.at !== 'string') return null
  return {
    topic: candidate.topic,
    type: candidate.type,
    seq: candidate.seq,
    at: candidate.at,
    payload: candidate.payload,
  }
}

function transportError(message: string): ApiError {
  return new ApiError({
    status: 0,
    kind: 'network',
    code: 'realtime_unavailable',
    message,
    retryable: true,
  })
}
