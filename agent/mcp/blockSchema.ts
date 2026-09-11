/**
 * `Block` (`src/data/types/page.ts`) as Zod — T15 `create_page_draft`'s input.
 * `columns`/`toggle` nest `Block[]` one level (their own type enforces no
 * deeper nesting; this schema does not re-check that, `validatePage` does).
 */

import { z } from 'zod'

const base = { id: z.string().min(1) }

const headingBlock = z.object({ ...base, type: z.literal('heading'), level: z.union([z.literal(1), z.literal(2), z.literal(3)]), text: z.string() })
const textBlock = z.object({ ...base, type: z.literal('text'), md: z.string() })
const calloutBlock = z.object({ ...base, type: z.literal('callout'), tone: z.enum(['info', 'success', 'warning', 'neutral']), md: z.string() })
const dividerBlock = z.object({ ...base, type: z.literal('divider') })
const reportBlock = z.object({
  ...base,
  type: z.literal('report'),
  reportId: z.string(),
  view: z.enum(['chart', 'table', 'headline']),
  height: z.enum(['S', 'M', 'L', 'XL']),
  title: z.string().nullable(),
})
const metricBlock = z.object({
  ...base,
  type: z.literal('metric'),
  reportId: z.string(),
  seriesId: z.string().nullable(),
  format: z.enum(['value', 'value-delta', 'sparkline']),
})
const tableBlock = z.object({
  ...base,
  type: z.literal('table'),
  columns: z.array(z.object({ key: z.string(), label: z.string(), align: z.enum(['start', 'end']) })),
  rows: z.array(z.array(z.string())),
})
const alertStatusBlock = z.object({ ...base, type: z.literal('alert-status'), ruleIds: z.array(z.string()) })
const agentInsightBlock = z.object({
  ...base,
  type: z.literal('agent-insight'),
  jobId: z.string(),
  findingId: z.string(),
  md: z.string(),
  runIds: z.array(z.string()),
})
const bookmarkBlock = z.object({
  ...base,
  type: z.literal('bookmark'),
  target: z.object({ kind: z.enum(['page', 'report']), id: z.string() }),
})

/* `toggle`/`columns` reference `blockSchema` before it exists — `z.lazy` defers evaluation to call time. */
export const blockSchema: z.ZodType = z.lazy(() =>
  z.union([
    headingBlock,
    textBlock,
    calloutBlock,
    dividerBlock,
    z.object({ ...base, type: z.literal('toggle'), title: z.string(), open: z.boolean(), blocks: z.array(blockSchema) }),
    z.object({ ...base, type: z.literal('columns'), columns: z.array(z.object({ width: z.number().optional(), blocks: z.array(blockSchema) })) }),
    reportBlock,
    metricBlock,
    tableBlock,
    alertStatusBlock,
    agentInsightBlock,
    bookmarkBlock,
  ]),
)
