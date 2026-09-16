/**
 * `caseStudyToBlocks(study, jobId)` — pure (§7). No number without a run:
 * every digit comes from `finding.values`; `runIds` is that finding's
 * `evidence` plus each value's own `runId`, never assembled elsewhere.
 */

import { PAGE_HEADING_MAX, PAGE_TEXT_MD_MAX } from '../../types/page'
import type {
  AgentAlertProposal,
  AgentInsightBlock,
  Block,
  CalloutBlock,
  HeadingBlock,
  PageTableColumn,
  ReportBlock,
  TableBlock,
  TextBlock,
  ToggleBlock,
} from '../../types/page'
import type {
  CaseStudy,
  CaseStudyAlternative,
  CaseStudyDataQuality,
  CaseStudyFinding,
  CaseStudyFindingValue,
  CaseStudyRecommendation,
} from '../../types/agent'

/** Cuts to `max` characters, never longer — the guarantee `validatePage` relies on for any valid study, however long its prose. */
function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  const ellipsis = '…'
  return text.slice(0, Math.max(0, max - ellipsis.length)) + ellipsis
}

/**
 * One line of evidence, read only from the value itself. Money stays
 * integer halalas (§8.3, "money is the UI's job") — this writes data, not a
 * formatted caption.
 */
function formatValueLine(value: CaseStudyFindingValue): string {
  const unitText = value.unit === 'money' ? `halalas${value.currency ? ` ${value.currency}` : ''}` : value.unit
  return `- ${value.seriesId} · ${value.bucket}: **${value.value} ${unitText}** (run ${value.runId})`
}

function questionHeading(study: CaseStudy, jobId: string): HeadingBlock {
  return { id: `${jobId}-question`, type: 'heading', level: 1, text: truncate(study.question, PAGE_HEADING_MAX) }
}

function findingTextBlock(finding: CaseStudyFinding, jobId: string): TextBlock {
  return { id: `${jobId}-finding-${finding.id}-text`, type: 'text', md: truncate(finding.text, PAGE_TEXT_MD_MAX) }
}

/**
 * The evidence block: every number is a line built from `finding.values`,
 * and `runIds` is exactly the union of `finding.evidence` and each value's
 * own `runId` — never a number added without the run that produced it.
 */
function findingEvidenceBlock(
  finding: CaseStudyFinding,
  jobId: string,
  alertProposal: AgentAlertProposal | null,
): AgentInsightBlock {
  const md = finding.values.map(formatValueLine).join('\n')
  const runIds = Array.from(new Set([...finding.evidence, ...finding.values.map((v) => v.runId)]))
  return {
    id: `${jobId}-finding-${finding.id}-evidence`,
    type: 'agent-insight',
    jobId,
    findingId: finding.id,
    md: truncate(md, PAGE_TEXT_MD_MAX),
    runIds,
    alertProposal,
  }
}

/**
 * AC-1260: one optional field on an existing block, not a new `Block` variant.
 * Recommendations pair with findings BY POSITION (`recommendations[i]` for
 * `findings[i]`); a proposal needs a saved chart (T13) and a series, or none is offered.
 */
function alertProposalFor(
  finding: CaseStudyFinding,
  recommendation: CaseStudyRecommendation | undefined,
  chartReportIds?: Readonly<Record<string, string>>,
): AgentAlertProposal | null {
  const condition = recommendation?.verifyWith.alertCondition ?? null
  const reportId = chartReportIds?.[finding.id]
  const seriesId = finding.values[0]?.seriesId
  if (condition === null || !reportId || reportId.trim().length === 0 || !seriesId) return null
  return { reportId, seriesId, condition }
}

/** The finding's chart, once T13 has saved it — never minted here, only relayed (input, not a lookup). */
function findingChartBlock(finding: CaseStudyFinding, jobId: string, reportId: string): ReportBlock {
  return { id: `${jobId}-finding-${finding.id}-chart`, type: 'report', reportId, view: 'chart', height: 'M', title: null }
}

/* The headings are stored in the page with the study, so they are written in
   the study's own language rather than looked up at render time (§4). */
const CONTRIBUTOR_HEADINGS: Record<CaseStudy['language'], Record<string, string>> = {
  en: { dimension: 'Dimension', group: 'Group', deltaAbs: 'Change', shareOfChangePct: 'Share of change %', runId: 'Run' },
  ar: { dimension: 'البُعد', group: 'المجموعة', deltaAbs: 'التغيّر', shareOfChangePct: 'الحصة من التغيّر %', runId: 'التشغيل' },
}

function contributorColumns(language: CaseStudy['language']): PageTableColumn[] {
  const heading = CONTRIBUTOR_HEADINGS[language]
  return [
    { key: 'dimension', label: heading.dimension!, align: 'start' },
    { key: 'group', label: heading.group!, align: 'start' },
    { key: 'deltaAbs', label: heading.deltaAbs!, align: 'end' },
    { key: 'shareOfChangePct', label: heading.shareOfChangePct!, align: 'end' },
    { key: 'runId', label: heading.runId!, align: 'start' },
  ]
}

/**
 * §7's rendering rule (`01-analyst-agent.md:330`): a table block, one row
 * per contributor with its own `runId`. Always present, even with zero
 * contributors — an empty table is the empty state, never an omitted block.
 */
function contributorsTableBlock(study: CaseStudy, jobId: string): TableBlock {
  return {
    id: `${jobId}-contributors`,
    type: 'table',
    columns: contributorColumns(study.language),
    rows: study.contributors.map((c) => [c.dimension, c.group, String(c.deltaAbs), String(c.shareOfChangePct), c.runId]),
  }
}

function alternativeToggle(alternative: CaseStudyAlternative, jobId: string, index: number): ToggleBlock {
  const id = `${jobId}-alt-${index}`
  const evidence: AgentInsightBlock = {
    id: `${id}-evidence`,
    type: 'agent-insight',
    jobId,
    findingId: id,
    md: truncate(`${alternative.verdict}: ${alternative.text}`, PAGE_TEXT_MD_MAX),
    runIds: Array.from(new Set(alternative.evidence)),
  }
  return { id, type: 'toggle', title: alternative.hypothesis, open: false, blocks: [evidence] }
}

function recommendationTextBlock(recommendation: CaseStudyRecommendation, jobId: string, index: number): TextBlock {
  const effect = recommendation.expectedEffect
  const lines = [
    recommendation.text,
    `Owner: ${recommendation.ownerRole}`,
    `Expected effect: ${effect.direction} ${effect.measureKey}${effect.magnitude !== null ? ` by ${effect.magnitude}` : ''}`,
    `Review by: ${recommendation.reviewBy}`,
  ]
  return { id: `${jobId}-rec-${index}`, type: 'text', md: truncate(lines.join('\n\n'), PAGE_TEXT_MD_MAX) }
}

function dataQualityCallout(dataQuality: CaseStudyDataQuality, jobId: string): CalloutBlock {
  const lines = [dataQuality.coverageNote]
  if (dataQuality.gaps.length > 0) lines.push(`Gaps: ${dataQuality.gaps.join(', ')}`)
  if (dataQuality.blockedSeries.length > 0) lines.push(`Blocked series: ${dataQuality.blockedSeries.join(', ')}`)
  if (dataQuality.truncated) lines.push('This study stopped early; findings are partial.')
  return {
    id: `${jobId}-data-quality`,
    type: 'callout',
    tone: 'neutral',
    md: truncate(lines.join('\n'), PAGE_TEXT_MD_MAX),
  }
}

/**
 * Converts a validated `CaseStudy` into an ordered `Block[]`. `chartReportIds`
 * (finding id → `reportId`) is T13's data, handed in not fetched — a finding
 * missing from it degrades to its evidence block alone (never throws, AC-1129).
 */
export function caseStudyToBlocks(
  study: CaseStudy,
  jobId: string,
  chartReportIds?: Readonly<Record<string, string>>,
): Block[] {
  const blocks: Block[] = [questionHeading(study, jobId)]

  study.findings.forEach((finding, i) => {
    blocks.push(findingTextBlock(finding, jobId))
    const reportId = chartReportIds?.[finding.id]
    if (reportId && reportId.trim().length > 0) blocks.push(findingChartBlock(finding, jobId, reportId))
    blocks.push(findingEvidenceBlock(finding, jobId, alertProposalFor(finding, study.recommendations[i], chartReportIds)))
  })

  blocks.push(contributorsTableBlock(study, jobId))
  study.alternatives.forEach((alternative, i) => blocks.push(alternativeToggle(alternative, jobId, i)))
  study.recommendations.forEach((recommendation, i) => blocks.push(recommendationTextBlock(recommendation, jobId, i)))
  blocks.push(dataQualityCallout(study.dataQuality, jobId))

  return blocks
}
