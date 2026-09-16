/**
 * T3 `glossary` — AC-1240. Reads `api/_lib/glossary.ts`'s generator over the
 * fixture catalogue; no hand-maintained copy of a measure's definition
 * (F-V2-54).
 */

import { beforeEach, afterEach, describe, expect, it } from 'vitest'
import { disableMockLatency, resetDataLayer } from '../../src/data/clients/index'
import { measureFixtures } from '../../src/data/fixtures/measures'
import { buildGlossaryMarkdown } from '../../api/_lib/glossary'
import { buildTestClient, callTool, textOf } from './testHarness.js'
import type { Client } from '@modelcontextprotocol/sdk/client/index.js'

describe('T3 glossary', () => {
  let client: Client
  let close: () => Promise<void>

  beforeEach(async () => {
    disableMockLatency()
    resetDataLayer()
    ;({ client, close } = await buildTestClient())
  })

  afterEach(async () => {
    await close()
  })

  it('returns the whole catalogue glossary with no term', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', {}))
    const markdown = body.markdown as string
    expect(markdown).toContain('## Business rules')
    expect(markdown).toContain('### trips.completed')
    expect(markdown).toContain('## Tool rules')
  })

  it('carries the current definition of financials.arpa (mean per active subscription, not raw revenue)', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', { term: 'financials.arpa' }))
    const markdown = body.markdown as string
    expect(markdown).toContain('### financials.arpa')
    // The redefinition: `arpaHalalas` off the same `daily-snapshots` row, divided
    // by active subscriptions there — never the un-divided subscription revenue.
    expect(markdown).toContain('Counts every row of `daily-snapshots`, bucketed by `date`.')
    expect(markdown).toContain('Aggregated per bucket as `mean`')
    expect(markdown).toContain('Unit: money (SAR, halalas on the wire).')
  })

  it('carries the current definition of requests.timeToAssign (request to assignment minutes, not a constant 1)', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', { term: 'requests.timeToAssign' }))
    const markdown = body.markdown as string
    expect(markdown).toContain('### requests.timeToAssign')
    // The redefinition: real duration off `requests` (requestedAt -> assignedAt),
    // not a `trips` row that always contributed exactly 1.
    expect(markdown).toContain('Counts rows matching `rb.pop.requests.assigned` of `requests`, bucketed by `requestedAt`.')
    expect(markdown).toContain('Unit: minutes.')
  })

  it('matches a tool-only rule the catalogue generator cannot produce', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', { term: 'run-provenance' }))
    const markdown = body.markdown as string
    expect(markdown).toContain('## Tool rules')
    expect(markdown).toContain('run-provenance')
    expect(markdown.toLowerCase()).toContain('runid')
  })

  it('agrees with the generator called directly on the same catalogue — the drift guard', async () => {
    const body = textOf(await callTool(client, 'eyvar_glossary', { term: 'revenue' }))
    const markdown = body.markdown as string
    // `revenue` matches no tool-only rule, so T3's output must equal exactly
    // what the server's own generator produces over the same measure list —
    // the mock backend must not hand-roll a second copy of this logic.
    expect(markdown).toBe(buildGlossaryMarkdown(measureFixtures, 'revenue'))
  })

  it('refuses a non-string term with the schema error', async () => {
    const result = await callTool(client, 'eyvar_glossary', { term: 5 })
    expect(result.isError).toBe(true)
  })
})
