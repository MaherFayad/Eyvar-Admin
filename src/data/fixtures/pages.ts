/**
 * Pages — `03-pages-and-dashboards.md`. `pageFixtures` is `dashboardFixtures`
 * (`reports.ts`) migrated through `dashboardToPage`, so `DSH-1` … `DSH-3`
 * answer both `/dashboards/:id` and `/pages/:id` with one record.
 *
 * `Page` carries no `template: boolean` yet (§6 names one; `types/page.ts`
 * does not) — `pageTemplateFixtures` below mark themselves with
 * `tags: ['template']` instead, a gap for the types owner, not a fixture
 * choice. `pageFixtures[2]` is the draft case study `AGT-1` produced, built
 * with the real `caseStudyToBlocks()` rather than hand-authored blocks, so a
 * change to that converter is visible here too.
 */

import { caseStudyToBlocks } from '../reporting/agent/caseStudyToBlocks'
import { dashboardToPage } from '../reporting/pages/migrate'
import { DONE_JOB_CASE_STUDY, DONE_JOB_ID, DONE_JOB_RESULT_PAGE_ID } from './agent'
import { dashboardFixtures } from './reports'
import { offsetFromNow } from '../mock/clock'
import type { Page } from '../types/page'

/** `DSH-1` … `DSH-3`, migrated. Same ids, so a v1 dashboard link still resolves. */
export const migratedPageFixtures: Page[] = dashboardFixtures.map(dashboardToPage)

/** §6 — three shipped templates, each a draft the moment it is copied. */
export const pageTemplateFixtures: Page[] = [
  {
    id: 'PAGE-TPL-1',
    kind: 'dashboard',
    title: 'Monday morning',
    icon: null,
    description: 'The three numbers to check before the stand-up.',
    ownerId: 'USR-1',
    visibility: 'team',
    tags: ['template'],
    official: true,
    scope: { range: null, filters: [] },
    blocks: [
      { id: 'tpl1-h', type: 'heading', level: 1, text: 'Monday morning' },
      { id: 'tpl1-t', type: 'text', md: 'Start with captains vs riders, then completed trips by district.' },
      { id: 'tpl1-r1', type: 'report', reportId: 'RPT-1', view: 'chart', height: 'M', title: null },
      { id: 'tpl1-r2', type: 'report', reportId: 'RPT-2', view: 'chart', height: 'M', title: null },
    ],
    version: 1,
    publishedAt: offsetFromNow({ days: -60 }),
    createdAt: offsetFromNow({ days: -60 }),
    updatedAt: offsetFromNow({ days: -60 }),
    updatedBy: 'USR-1',
  },
  {
    id: 'PAGE-TPL-2',
    kind: 'dashboard',
    title: 'Finance weekly',
    icon: null,
    description: 'Revenue over the last quarter and a headline for this week’s subscriptions.',
    ownerId: 'USR-2',
    visibility: 'team',
    tags: ['template'],
    official: true,
    scope: { range: null, filters: [] },
    blocks: [
      { id: 'tpl2-h', type: 'heading', level: 1, text: 'Finance weekly' },
      { id: 'tpl2-r1', type: 'report', reportId: 'RPT-3', view: 'chart', height: 'L', title: null },
      { id: 'tpl2-m1', type: 'metric', reportId: 'RPT-18', seriesId: null, format: 'value-delta' },
    ],
    version: 1,
    publishedAt: offsetFromNow({ days: -60 }),
    createdAt: offsetFromNow({ days: -60 }),
    updatedAt: offsetFromNow({ days: -60 }),
    updatedBy: 'USR-2',
  },
  {
    id: 'PAGE-TPL-3',
    kind: 'dashboard',
    title: 'Growth review',
    icon: null,
    description: 'The activation funnel and the retention matrix behind it.',
    ownerId: 'USR-1',
    visibility: 'team',
    tags: ['template'],
    official: true,
    scope: { range: null, filters: [] },
    blocks: [
      { id: 'tpl3-h', type: 'heading', level: 1, text: 'Growth review' },
      { id: 'tpl3-r1', type: 'report', reportId: 'RPT-6', view: 'chart', height: 'M', title: null },
      { id: 'tpl3-r2', type: 'report', reportId: 'RPT-7', view: 'table', height: 'L', title: null },
    ],
    version: 1,
    publishedAt: offsetFromNow({ days: -60 }),
    createdAt: offsetFromNow({ days: -60 }),
    updatedAt: offsetFromNow({ days: -60 }),
    updatedBy: 'USR-1',
  },
]

/**
 * `AGT-1`'s output, converted the way the runner does — `RPT-5` is the saved
 * report behind `cancellationTrend`, so the first finding's evidence block is
 * followed by an actual chart, not just prose (§7, AC-1129).
 */
const draftCaseStudyPage: Page = {
  id: DONE_JOB_RESULT_PAGE_ID,
  kind: 'case-study',
  title: DONE_JOB_CASE_STUDY.title,
  icon: null,
  description: DONE_JOB_CASE_STUDY.headline.text,
  /* Owned by the acting operator, visibility private — §5's "T13 and T15
     write only drafts owned by the acting operator"; nothing the agent
     writes is visible to the team until an operator publishes it. */
  ownerId: 'USR-7',
  visibility: 'private',
  tags: [],
  official: false,
  scope: { range: null, filters: [] },
  blocks: caseStudyToBlocks(DONE_JOB_CASE_STUDY, DONE_JOB_ID, { F1: 'RPT-5' }),
  version: 1,
  /* `null` — a draft (agent output), matching §4's "Save as page" affordance. */
  publishedAt: null,
  createdAt: offsetFromNow({ hours: -1, minutes: -42 }),
  updatedAt: offsetFromNow({ hours: -1, minutes: -42 }),
  updatedBy: 'USR-7',
}

export const pageFixtures: Page[] = [...migratedPageFixtures, ...pageTemplateFixtures, draftCaseStudyPage]
