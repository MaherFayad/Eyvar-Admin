#!/usr/bin/env node
/**
 * WP-6.8 — the operator's real path through the live backend, not every
 * endpoint. `docs/09-analytics-v2/05-backend.md` §10 stages cutover as
 * session → catalogue → reports.run → reports/pages → alerts/crons →
 * agent; this script walks that order once, asserting **meaning**: a 200
 * with an empty or malformed body is reported as a failure, not a pass, and
 * a recorded run that comes back with no `runId` is a failure even though
 * the HTTP status is 200 (see `runReportAndRecord` — this is expected to
 * fail today; `cutover.md` explains why).
 *
 * Reads its target the way the Playwright harnesses read `HARNESS_BASE`
 * (`scripts/harness/*.mjs`), except this base is the API origin
 * (`vercel dev`'s default, or a preview deployment's origin), not the Vite
 * dev server's.
 *
 * Env:
 *   HARNESS_BASE        API origin. Default http://localhost:3000.
 *   SMOKE_EMAIL          Sign-in email. Required unless SMOKE_SESSION_COOKIE is set.
 *   SMOKE_PASSWORD       Sign-in password.
 *   SMOKE_TOTP_SECRET    Base32 TOTP secret for the smoke account, if its
 *                        second factor is an authenticator app. Without it,
 *                        a 'challenge' sign-in outcome cannot be answered —
 *                        the smoke account must be TOTP-enrolled up front;
 *                        an SMS code cannot be read by a script.
 *   SMOKE_SESSION_COOKIE An already-valid `eyvar_session=...` cookie value.
 *                        When set, sign-in is skipped entirely and this
 *                        cookie is used as-is (useful in CI, where nobody
 *                        can answer a fresh challenge).
 *
 * Never reads or sends CRON_SECRET — the cron surface is out of scope; a
 * cron's own guard is proven by `api/cron/*.test.ts`, not by this script.
 *
 * Exit 0 iff every step passed. `skip` does not fail the run — it means the
 * deployment has no data yet for that step (a fresh preview with nothing
 * saved), which is expected early in cutover and is printed, not hidden.
 */

import { createHmac } from 'node:crypto'

const BASE = (process.env.HARNESS_BASE ?? 'http://localhost:3000').replace(/\/$/, '')
const API = `${BASE}/api/v1`
const TIMEOUT_MS = Number(process.env.SMOKE_TIMEOUT_MS ?? 15_000)

/* ─────────────────────────── tiny step runner ──────────────────────────── */

const results = []

async function step(name, fn) {
  const start = Date.now()
  try {
    const detail = await fn()
    const ms = Date.now() - start
    results.push({ name, status: 'pass', detail: detail ?? '', ms })
    console.log(`[PASS] ${name} (${ms}ms)${detail ? ` — ${detail}` : ''}`)
    return detail
  } catch (err) {
    const ms = Date.now() - start
    if (err && err.skip) {
      results.push({ name, status: 'skip', detail: err.message, ms })
      console.log(`[SKIP] ${name} (${ms}ms) — ${err.message}`)
      return undefined
    }
    results.push({ name, status: 'fail', detail: err instanceof Error ? err.message : String(err), ms })
    console.log(`[FAIL] ${name} (${ms}ms) — ${err instanceof Error ? err.message : String(err)}`)
    return undefined
  }
}

function skip(message) {
  const err = new Error(message)
  err.skip = true
  return err
}

function fail(message) {
  throw new Error(message)
}

/* ─────────────────────────────── cookie jar ────────────────────────────── */

const jar = new Map()

function setCookiesFrom(res) {
  const raw = typeof res.headers.getSetCookie === 'function' ? res.headers.getSetCookie() : []
  const list = raw.length > 0 ? raw : (res.headers.get('set-cookie') ? [res.headers.get('set-cookie')] : [])
  for (const line of list) {
    const first = line.split(';')[0]
    const eq = first.indexOf('=')
    if (eq === -1) continue
    jar.set(first.slice(0, eq).trim(), first.slice(eq + 1).trim())
  }
}

function cookieHeader() {
  if (jar.size === 0) return undefined
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ')
}

/* ─────────────────────────────── fetch helper ──────────────────────────── */

/**
 * Every call, wired with the timeout and cookie jar. Returns
 * `{ status, body, headers }`; `body` is the parsed JSON, or the raw text
 * with `isJson: false` for a non-JSON response (only `catalogue.glossary`
 * is expected to hit that path — it answers markdown, not JSON).
 */
async function call(method, path, { body, headers = {}, idempotent = false } = {}) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const cookie = cookieHeader()
    const res = await fetch(`${API}${path}`, {
      method,
      signal: controller.signal,
      headers: {
        ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
        ...(cookie ? { cookie } : {}),
        ...(idempotent ? { 'idempotency-key': crypto.randomUUID() } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
    setCookiesFrom(res)
    const contentType = res.headers.get('content-type') ?? ''
    const text = await res.text()
    if (!contentType.includes('application/json')) {
      return { status: res.status, body: text, isJson: false, headers: res.headers }
    }
    if (text === '') return { status: res.status, body: null, isJson: true, headers: res.headers }
    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      fail(`${method} ${path}: 200-class response was not valid JSON: ${text.slice(0, 200)}`)
    }
    return { status: res.status, body: parsed, isJson: true, headers: res.headers }
  } finally {
    clearTimeout(timer)
  }
}

function assertOk(res, path) {
  if (res.status < 200 || res.status >= 300) {
    const code = res.isJson && res.body && typeof res.body === 'object' ? res.body.code : undefined
    fail(`${path} returned ${res.status}${code ? ` (${code})` : ''}`)
  }
}

/** `Single<T>`: `{ data: T }`, `data` not null. A 200 with `{}` or `{ data: null }` is the "empty body" failure the brief names. */
function assertSingle(res, path) {
  assertOk(res, path)
  if (!res.body || typeof res.body !== 'object' || !('data' in res.body) || res.body.data === null || res.body.data === undefined) {
    fail(`${path}: expected Single<T> ({ data }) with a non-null data, got ${JSON.stringify(res.body).slice(0, 200)}`)
  }
  return res.body.data
}

/** `Paginated<T>`: `items` must be an array (empty is fine — no data yet), and the paging fields must be the numbers CONTRACT.md §2 declares. */
function assertPaginated(res, path) {
  assertOk(res, path)
  const b = res.body
  if (!b || typeof b !== 'object' || !Array.isArray(b.items)) {
    fail(`${path}: expected Paginated<T> ({ items: [] }), got ${JSON.stringify(b).slice(0, 200)}`)
  }
  for (const field of ['page', 'pageSize', 'total', 'totalPages']) {
    if (typeof b[field] !== 'number') fail(`${path}: Paginated<T>.${field} is not a number (${JSON.stringify(b[field])})`)
  }
  return b
}

/** A bare-`T` endpoint (CONTRACT.md §2's named exception) — just not null/empty. */
function assertBare(res, path) {
  assertOk(res, path)
  if (res.body === null || res.body === undefined) fail(`${path}: 200 with an empty body`)
  return res.body
}

/* ────────────────────────────── TOTP (RFC 6238) ─────────────────────────
 * Mirrors `api/_lib/otp.ts`'s `totpAt` exactly (same algorithm, same 30 s
 * step, same digit count) so this script can answer a 'challenge' outcome
 * for a TOTP-enrolled smoke account without importing server code across
 * the module-resolution boundary. Not a new dependency — `node:crypto` only,
 * the same reasoning `otp.ts`'s own header gives for not using `otplib`.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'

function base32Decode(secret) {
  const clean = secret.replace(/\s|=/g, '').toUpperCase()
  let bits = ''
  for (const char of clean) {
    const index = BASE32_ALPHABET.indexOf(char)
    if (index === -1) continue
    bits += index.toString(2).padStart(5, '0')
  }
  const bytes = []
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2))
  return Buffer.from(bytes)
}

function totpAt(secret, atMs = Date.now()) {
  const key = base32Decode(secret)
  const counter = Math.floor(atMs / 1000 / 30)
  const counterBuf = Buffer.alloc(8)
  counterBuf.writeBigUInt64BE(BigInt(counter))
  const hmac = createHmac('sha1', key).update(counterBuf).digest()
  const offset = hmac[hmac.length - 1] & 0xf
  const binCode =
    ((hmac[offset] & 0x7f) << 24) | ((hmac[offset + 1] & 0xff) << 16) | ((hmac[offset + 2] & 0xff) << 8) | (hmac[offset + 3] & 0xff)
  return String(binCode % 1_000_000).padStart(6, '0')
}

/* ────────────────────────────── the journey ─────────────────────────────── */

let permissions = []

async function signIn() {
  if (process.env.SMOKE_SESSION_COOKIE) {
    jar.set('eyvar_session', process.env.SMOKE_SESSION_COOKIE)
    return 'used SMOKE_SESSION_COOKIE, sign-in skipped'
  }

  const email = process.env.SMOKE_EMAIL
  const password = process.env.SMOKE_PASSWORD
  if (!email || !password) {
    throw skip('SMOKE_EMAIL/SMOKE_PASSWORD (or SMOKE_SESSION_COOKIE) not set')
  }

  const signInRes = await call('POST', '/auth/sign-in', { body: { email, password } })
  assertOk(signInRes, 'POST /auth/sign-in')
  const outcome = signInRes.body

  if (outcome.kind === 'failed') {
    fail(`sign-in refused: reason=${outcome.reason}${outcome.lockedUntil ? ` lockedUntil=${outcome.lockedUntil}` : ''}`)
  }
  if (outcome.kind === 'enrolment-required') {
    fail('sign-in wants second-factor enrolment — the smoke account must be pre-enrolled (TOTP), not enrolled by this script')
  }
  if (outcome.kind !== 'challenge') fail(`unrecognised sign-in outcome kind: ${outcome.kind}`)

  if (outcome.secondFactor.method !== 'totp') {
    fail(`smoke account's second factor is '${outcome.secondFactor.method}', not 'totp' — a script cannot read an SMS code`)
  }
  const totpSecret = process.env.SMOKE_TOTP_SECRET
  if (!totpSecret) fail('sign-in opened a TOTP challenge but SMOKE_TOTP_SECRET is not set')

  const code = totpAt(totpSecret)
  const verifyRes = await call('POST', '/auth/verify-code', {
    body: { challengeId: outcome.challengeId, code },
    idempotent: true,
  })
  assertOk(verifyRes, 'POST /auth/verify-code')
  const verified = verifyRes.body
  if (verified.kind !== 'signed-in') fail(`verify-code did not sign in: ${verified.kind}/${verified.reason ?? ''}`)
  if (!jar.has('eyvar_session')) fail('verify-code returned signed-in but set no eyvar_session cookie')
  return `signed in as ${verified.session.email}`
}

/** Every step after sign-in needs a cookie. Skip rather than fail when there is none — that is a configuration gap (no credentials given), not a defect in what was reached. */
function requireSession() {
  if (!jar.has('eyvar_session')) throw skip('no session established — sign-in was skipped or failed above')
}

async function readSession() {
  requireSession()
  const res = await call('GET', '/session')
  const session = assertBare(res, 'GET /session')
  if (!session.userId || !session.email) fail('GET /session: missing userId or email')
  if (!Array.isArray(session.permissions)) fail('GET /session: permissions is not an array')
  permissions = session.permissions
  if (!permissions.includes('view_analytics')) {
    fail(`smoke account lacks 'view_analytics' — the rest of this journey needs it (has: ${permissions.join(', ') || 'none'})`)
  }
  return `${session.email}, role ${session.role}, ${permissions.length} permission(s)`
}

let firstMeasure = null

async function readCatalogue() {
  requireSession()
  const measuresRes = await call('GET', '/catalogue/measures')
  const measures = assertPaginated(measuresRes, 'GET /catalogue/measures')
  if (measures.items.length === 0) fail('catalogue/measures: 200 but zero measures — an empty catalogue cannot back any report')
  for (const m of measures.items) {
    if (!m.key || !m.labelKey || !m.category) fail(`catalogue/measures: item missing key/labelKey/category: ${JSON.stringify(m).slice(0, 150)}`)
  }
  firstMeasure = measures.items[0]

  const dimsRes = await call('GET', '/catalogue/dimensions')
  const dims = assertPaginated(dimsRes, 'GET /catalogue/dimensions')
  for (const d of dims.items) {
    if (!d.key || !d.resource) fail(`catalogue/dimensions: item missing key/resource: ${JSON.stringify(d).slice(0, 150)}`)
  }

  const glossaryRes = await call('GET', '/catalogue/glossary')
  assertOk(glossaryRes, 'GET /catalogue/glossary')
  if (glossaryRes.isJson) fail('catalogue/glossary: expected markdown (text/markdown), got JSON — the docblock/handler shape has drifted')
  if (typeof glossaryRes.body !== 'string' || glossaryRes.body.trim() === '') fail('catalogue/glossary: 200 with an empty body')

  return `${measures.items.length} measure(s), ${dims.items.length} dimension(s), glossary ${glossaryRes.body.length} chars`
}

let reportId = null

/**
 * The core assertion this step exists for: `X-Eyvar-Record-Run: 1` on
 * `reports.run` is documented (`src/data/clients/runs.ts`'s `recordRun`
 * docblock) to answer `{ runId, result, summary }`. A response that omits
 * `runId` is a failure here even at HTTP 200 — a report with no run id is
 * exactly the "answer nobody can cite" `05-backend.md` §5 and
 * `BUILD-LOG.md`'s F-V2-90 describe. See `cutover.md`'s preconditions: this
 * is expected to fail against today's server, which persists the run but
 * never returns its id.
 */
async function runReportAndRecord(query) {
  const res = await call('POST', '/reports/run', {
    body: query,
    headers: { 'X-Eyvar-Record-Run': '1' },
    idempotent: true,
  })
  assertOk(res, 'POST /reports/run (X-Eyvar-Record-Run: 1)')
  const result = res.body
  if (!result || typeof result !== 'object') fail('reports/run: 200 with an empty body')
  if (!Array.isArray(result.buckets) || !Array.isArray(result.series)) {
    fail('reports/run: missing buckets[]/series[] — not a ReportResult')
  }
  if (!('runId' in result) || !result.runId) {
    fail(
      "reports/run with X-Eyvar-Record-Run:1 did not return a runId — the run is persisted server-side but never cited back; " +
        'see cutover.md preconditions (provenance is derived, not recorded)',
    )
  }
  return result
}

async function runSavedOrAdHocReport() {
  requireSession()
  const listRes = await call('GET', '/reports')
  const reports = assertPaginated(listRes, 'GET /reports')

  if (reports.items.length > 0) {
    const saved = reports.items[0]
    const getRes = await call('GET', `/reports/${saved.id}`)
    const report = assertSingle(getRes, `GET /reports/${saved.id}`)
    if (!report.query || !Array.isArray(report.query.measures)) fail(`GET /reports/${saved.id}: no usable query`)
    reportId = report.id
    const result = await runReportAndRecord(report.query)
    return `ran saved report "${report.name}" (${report.id}): ${result.buckets.length} bucket(s), ${result.series.length} series`
  }

  if (!firstMeasure) fail('no saved reports and no catalogue measure to fall back to')
  const adHoc = {
    measures: [{ key: firstMeasure.key }],
    groupBy: [],
    filters: [],
    window: { kind: 'preset', preset: 'last-30d' },
    grain: firstMeasure.minGrain ?? 'day',
    periodComparison: 'none',
    chartType: 'line',
  }
  const result = await runReportAndRecord(adHoc)
  return `no saved reports on this deployment — ran an ad-hoc query on "${firstMeasure.key}" instead: ${result.buckets.length} bucket(s), ${result.series.length} series`
}

async function readAPage() {
  requireSession()
  const listRes = await call('GET', '/pages')
  const pages = assertPaginated(listRes, 'GET /pages')
  if (pages.items.length === 0) throw skip('no pages on this deployment yet')
  const first = pages.items[0]
  const getRes = await call('GET', `/pages/${first.id}`)
  const page = assertSingle(getRes, `GET /pages/${first.id}`)
  if (!page.title || !Array.isArray(page.blocks)) fail(`GET /pages/${first.id}: missing title or blocks[]`)
  return `"${page.title}" (${page.id}), ${page.blocks.length} block(s)`
}

async function listAlerts() {
  requireSession()
  const listRes = await call('GET', '/alerts')
  const alerts = assertPaginated(listRes, 'GET /alerts')
  if (alerts.items.length === 0) throw skip('no alert rules on this deployment yet')
  const first = alerts.items[0]
  const getRes = await call('GET', `/alerts/${first.id}`)
  const rule = assertSingle(getRes, `GET /alerts/${first.id}`)
  if (!rule.name || !rule.state) fail(`GET /alerts/${first.id}: missing name or state`)
  return `${alerts.items.length} rule(s); "${rule.name}" is ${rule.state}`
}

async function enqueueAndReadAgentJob() {
  requireSession()
  const createRes = await call('POST', '/agent/jobs', {
    body: {
      kind: 'ask',
      question: 'Smoke check — api-smoke.mjs, safe to ignore or cancel.',
      language: 'en',
      contextObjects: [],
    },
    idempotent: true,
  })
  const created = assertSingle(createRes, 'POST /agent/jobs')
  if (createRes.status !== 201) fail(`POST /agent/jobs: expected 201, got ${createRes.status}`)
  if (!created.id || created.state !== 'queued') fail(`POST /agent/jobs: expected a queued job with an id, got ${JSON.stringify(created).slice(0, 200)}`)

  const getRes = await call('GET', `/agent/jobs/${created.id}`)
  const read = assertSingle(getRes, `GET /agent/jobs/${created.id}`)
  if (read.id !== created.id) fail('GET /agent/jobs/:id returned a different job than was just created')

  const eventsRes = await call('GET', `/agent/jobs/${created.id}/events`)
  assertOk(eventsRes, `GET /agent/jobs/${created.id}/events`)
  if (!Array.isArray(eventsRes.body)) fail(`GET /agent/jobs/${created.id}/events: expected a bare array`)

  return `job ${created.id} (${read.state}), ${eventsRes.body.length} event(s) — left queued; no runner claimed it`
}

/* ──────────────────────────────── run ──────────────────────────────────── */

async function main() {
  console.log(`api-smoke: ${API}`)
  await step('sign in', signIn)
  await step('session.current', readSession)
  await step('read the catalogue', readCatalogue)
  await step('run a saved report (or ad-hoc)', runSavedOrAdHocReport)
  await step('read a page', readAPage)
  await step('list alerts', listAlerts)
  await step('enqueue and read an agent job', enqueueAndReadAgentJob)

  const passed = results.filter((r) => r.status === 'pass').length
  const skipped = results.filter((r) => r.status === 'skip').length
  const failed = results.filter((r) => r.status === 'fail').length
  console.log(`\n${passed} passed, ${skipped} skipped, ${failed} failed — ${API}`)
  /* `process.exitCode`, not `process.exit()` — a forced exit while `fetch`'s
     keep-alive sockets are still tearing down crashes libuv on Windows
     (`UV_HANDLE_CLOSING` assertion). Setting the code and letting Node exit
     once pending I/O drains is the same result without the crash. */
  process.exitCode = failed > 0 ? 1 : 0
}

main().catch((err) => {
  console.error('api-smoke: unhandled error', err)
  process.exitCode = 1
})
