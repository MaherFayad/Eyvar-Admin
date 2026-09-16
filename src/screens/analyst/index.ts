/** The analyst (D38, WP-7.4) — `?view=analyst` and its own detail route. */

export { AnalystView, type AnalystViewProps } from './AnalystView'
export { AskComposer, type AskComposerAttachment, type AskComposerProps } from './AskComposer'
export {
  analystAskUrl,
  readAnalystEntryContext,
  toAgentJobContext,
  withoutAnalystEntryContext,
  type AnalystEntryContext,
  type AnalystEntryKind,
} from './entryContext'
export { JobScreen } from './JobScreen'
export { JobTimeline, type JobTimelineProps } from './JobTimeline'
export { ProvenancePanel, type ProvenancePanelProps, type ProvenanceRun } from './ProvenancePanel'
export { ANALYST_EN } from './copy'
