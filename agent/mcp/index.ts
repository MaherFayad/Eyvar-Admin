/**
 * Registers every tool in 01-analyst-agent.md §5 (T1…T20; T14 and T16 are
 * each more than one tool on the wire) onto one `McpServer`. `server.ts` is
 * the only caller in production; tests call this against an `McpServer`
 * wired to `InMemoryTransport` instead of stdio.
 */

import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { registerCatalogueMeasures } from './tools/catalogueMeasures.js'
import { registerCatalogueDimensions } from './tools/catalogueDimensions.js'
import { registerGlossary } from './tools/glossary.js'
import { registerPlanQuery } from './tools/planQuery.js'
import { registerRunReport } from './tools/runReport.js'
import { registerCompareWindows } from './tools/compareWindows.js'
import { registerDescribeSeries } from './tools/describeSeries.js'
import { registerCorrelate } from './tools/correlate.js'
import { registerContribution } from './tools/contribution.js'
import { registerSampleRows } from './tools/sampleRows.js'
import { registerSavedReportsSearch } from './tools/savedReportsSearch.js'
import { registerGetSavedReport } from './tools/getSavedReport.js'
import { registerSaveReport } from './tools/saveReport.js'
import { registerPagesSearch } from './tools/pagesSearch.js'
import { registerGetPage } from './tools/getPage.js'
import { registerCreatePageDraft } from './tools/createPageDraft.js'
import { registerAlertsList } from './tools/alertsList.js'
import { registerAlertHistory } from './tools/alertHistory.js'
import { registerAlertContext } from './tools/alertContext.js'
import { registerAnnotationsList } from './tools/annotationsList.js'
import { registerPriorStudiesSearch } from './tools/priorStudiesSearch.js'
import { registerNoteFinding } from './tools/noteFinding.js'
import { registerJobContext } from './tools/jobContext.js'

export function registerAllTools(server: McpServer): void {
  registerCatalogueMeasures(server) // T1
  registerCatalogueDimensions(server) // T2
  registerGlossary(server) // T3
  registerPlanQuery(server) // T4
  registerRunReport(server) // T5
  registerCompareWindows(server) // T6
  registerDescribeSeries(server) // T7
  registerCorrelate(server) // T8
  registerContribution(server) // T9
  registerSampleRows(server) // T10
  registerSavedReportsSearch(server) // T11
  registerGetSavedReport(server) // T12
  registerSaveReport(server) // T13
  registerPagesSearch(server) // T14a
  registerGetPage(server) // T14b
  registerCreatePageDraft(server) // T15
  registerAlertsList(server) // T16a
  registerAlertHistory(server) // T16b
  registerAlertContext(server) // T16c
  registerAnnotationsList(server) // T17
  registerPriorStudiesSearch(server) // T18
  registerNoteFinding(server) // T19
  registerJobContext(server) // T20
}
