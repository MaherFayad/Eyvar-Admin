/**
 * Admin › Data & Compliance — `/admin/data`, route row `admin-data`
 * (`fixtures/routeTable.ts:801`), absorbing legacy settings panes `integrity`
 * and `export` (`settingsPanes`, `:810`).
 *
 * Three cards, in the order an operator meets them:
 *
 *   **Data integrity** (P6-T4) — zero coverage before this pass. Checks that
 *   compare a stored value against the records behind it, with the check that
 *   produced each finding named on every row. This is the card the sub-tab
 *   exists for and it carries the screen's ONE primary action (R3).
 *
 *   **Dataset export** — was a `setTimeout` and a toast naming a file that was
 *   never built. Now routed through `exportReport` + `reportCsvToText` +
 *   `downloadCsv`, so it produces a real file, through the one CSV path, with
 *   the audit entry that path carries.
 *
 *   **Retention schedules** — was a bare toast over two selects nothing read.
 *   Now reads and writes `clients/retention.ts`, and its save is disabled in
 *   place with a reason rather than hidden (§11.2).
 *
 * **Two legacy things deliberately not carried across.** `rebuildAllHistory()`
 * (`:18605`) generates trip and payment records so a stored total stops
 * disagreeing with the records behind it, prices the fabricated fares off rules
 * that contradict the live rate card, and has **no permission gate at all**
 * (`16b` §12 items 1–3). And the backup card that used to sit here rendered two
 * hard-coded snapshot rows — a real-looking snapshot id, a size and a time, none
 * of them from anything. A fabricated green tick on a backup page is worse than
 * an empty one, so it is gone until a client exists; raised in the handoff.
 */

import type { SubTabRoute } from '@/data/types'
import { PageHeader } from '@/components/PageHeader'
import { SingleColumnPage } from '@/components/PageShell'
import { useShell } from '@/shell/ShellContext'
import { useScreenViews, type ScreenView } from '@/hooks'
import { ViewTabs } from '@/components/ViewTabs'
import { ExportCard } from './ExportCard'
import { IntegrityPane } from './IntegrityPane'
import { RetentionCard } from './RetentionCard'

/* D20's three Data & Compliance panes, as `?view=`; the route row declares the same ids. */
const DATA_PANES: readonly ScreenView[] = [
  { id: 'integrity', titleKey: 'view.data.integrity' },
  { id: 'retention', titleKey: 'view.data.retention' },
  { id: 'exports', titleKey: 'view.data.exports' },
]

export function AdminDataScreen({ row }: { row: SubTabRoute }) {
  const { t, dir } = useShell().language
  const panes = useScreenViews(DATA_PANES, 'integrity', t)

  return (
    <SingleColumnPage
      header={<PageHeader title={t(row.titleKey)} meta={t('adminData.meta')} t={t} dir={dir} />}
    >
      <div className="flex max-w-6xl flex-col gap-6">
        <ViewTabs
          tabs={panes.tabs}
          activeTab={panes.activeTab}
          onSelectTab={panes.selectTab}
          label={t('admin.panes')}
        />
        {panes.activeTab === 'integrity' && <IntegrityPane />}
        {panes.activeTab === 'retention' && <RetentionCard />}
        {panes.activeTab === 'exports' && <ExportCard />}
      </div>
    </SingleColumnPage>
  )
}
