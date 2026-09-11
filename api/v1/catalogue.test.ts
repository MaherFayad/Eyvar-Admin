/**
 * `catalogue.*` end-to-end through the real router — WP-6.3, AC-1275.
 *
 * The seed loaded here is the generated
 * `docs/09-analytics-v2/examples/{measures,dimensions}.seed.sql`
 * (`scripts/fixtures-to-seed.mjs` from `src/data/fixtures/measures.ts`), not
 * a hand-typed fixture of the test's own — the point of AC-1275 is that the
 * server's rows and the frontend's fixture are the **same source**, so a
 * test author cannot accidentally paper over a real drift by retyping the
 * expectation to match whatever the server happens to return.
 */
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { PGlite } from '@electric-sql/pglite'
import { createTestDatabase, seedSession, seedUser } from '../_test/db'
import type { Database } from '../_lib/db'
import { createApiHandler } from './[...route]'
import { signSessionId } from '../_lib/auth'
import type { ApiErrorBody } from '../_lib/errors'
import type { Paginated } from '@/data/types/common'
import type { Dimension, Measure } from '@/data/types/measure'
import { measureFixtures, dimensionFixtures } from '@/data/fixtures/measures'

const SESSION_SECRET = 'wp-6.3-test-secret'
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const EXAMPLES_DIR = path.resolve(__dirname, '../../docs/09-analytics-v2/examples')

let pglite: PGlite
let db: Database
let handler: (req: Request) => Promise<Response>
let cookie: string

beforeAll(() => {
  process.env.SESSION_SECRET = SESSION_SECRET
})

beforeEach(async () => {
  const setup = await createTestDatabase()
  pglite = setup.pglite
  db = setup.db
  handler = createApiHandler({ db })

  // Generated seed, not hand-typed — `scripts/fixtures-to-seed.mjs`'s own output.
  const measuresSql = await readFile(path.join(EXAMPLES_DIR, 'measures.seed.sql'), 'utf8')
  const dimensionsSql = await readFile(path.join(EXAMPLES_DIR, 'dimensions.seed.sql'), 'utf8')
  await pglite.exec(measuresSql)
  await pglite.exec(dimensionsSql)

  const user = await seedUser(db, { email: 'analyst@eyvar.test', password: 'pw-correct', roleId: 'Ops Manager' })
  const sessionId = await seedSession(db, { userId: user.id })
  cookie = `eyvar_session=${encodeURIComponent(signSessionId(sessionId, SESSION_SECRET))}`
})

afterEach(async () => {
  await pglite.close()
})

function get(path: string): Request {
  return new Request(`http://localhost/api/v1${path}`, { headers: { cookie } })
}

describe('catalogue.measures (AC-1275)', () => {
  it('equals the seeded fixture list field for field', async () => {
    const response = await handler(get('/catalogue/measures?pageSize=100'))
    expect(response.status).toBe(200)

    const body = (await response.json()) as Paginated<Measure>
    expect(body.total).toBe(measureFixtures.length)
    expect(body.items).toEqual(measureFixtures)
  })

  it('401s an unauthenticated request', async () => {
    const response = await handler(new Request('http://localhost/api/v1/catalogue/measures'))
    expect(response.status).toBe(401)
    const body = (await response.json()) as ApiErrorBody
    expect(body.retryable).toBe(false)
  })

  it('filters by category', async () => {
    const response = await handler(get('/catalogue/measures?category=revenue&pageSize=100'))
    const body = (await response.json()) as Paginated<Measure>
    expect(body.items.length).toBeGreaterThan(0)
    for (const measure of body.items) expect(measure.category).toBe('revenue')
    expect(body.items).toEqual(measureFixtures.filter((m) => m.category === 'revenue'))
  })

  it('pairableWith narrows to measures sharing temporality, unit and currency, computed against the whole catalogue', async () => {
    const response = await handler(get('/catalogue/measures?pairableWith=trips.completed&pageSize=100'))
    const body = (await response.json()) as Paginated<Measure>

    const first = measureFixtures.find((m) => m.key === 'trips.completed')!
    const expectedKeys = measureFixtures
      .filter((m) => m.key !== first.key && m.temporality === first.temporality && m.unit === first.unit && m.currency === first.currency)
      .map((m) => m.key)

    expect(body.items.map((m) => m.key).sort()).toEqual(expectedKeys.sort())
    expect(body.items.some((m) => m.key === 'trips.completed')).toBe(false)
  })

  it('an unknown pairableWith key narrows to nothing rather than to everything', async () => {
    const response = await handler(get('/catalogue/measures?pairableWith=not-a-real-measure&pageSize=100'))
    const body = (await response.json()) as Paginated<Measure>
    expect(body.items).toEqual([])
  })
})

describe('catalogue.dimensions', () => {
  it('equals the seeded fixture list field for field', async () => {
    const response = await handler(get('/catalogue/dimensions?pageSize=100'))
    expect(response.status).toBe(200)

    const body = (await response.json()) as Paginated<Dimension>
    expect(body.total).toBe(dimensionFixtures.length)
    expect(body.items).toEqual(dimensionFixtures)
  })
})

describe('catalogue.glossary', () => {
  it('returns markdown covering every seeded measure and the fixed business rules', async () => {
    const response = await handler(get('/catalogue/glossary'))
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/markdown')

    const markdown = await response.text()
    expect(markdown).toContain('Riyadh')
    expect(markdown).toContain('never zero') // the gap rule
    for (const measure of measureFixtures) expect(markdown).toContain(measure.key)
  })

  it('narrows to matching measures with ?term=', async () => {
    const response = await handler(get('/catalogue/glossary?term=revenue'))
    const markdown = await response.text()

    for (const measure of measureFixtures.filter((m) => m.category === 'revenue')) {
      expect(markdown).toContain(measure.key)
    }
    expect(markdown).not.toContain('captains.registered')
  })
})
