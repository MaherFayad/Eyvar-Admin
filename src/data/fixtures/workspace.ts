/**
 * Seeded workspace settings — legacy `DB.opsConfig.general` (`:2570`),
 * `DB.branding` (`:18388`) and `DB.legalDocuments` (`:13867`), merged into the
 * one record the `admin-workspace` route row describes.
 *
 * **Every value is the legacy value.** The screen this replaces had invented
 * `'support@eyvar.com'` (legacy is `.app`), `'+966 11 400 0000'` (legacy is
 * `11 000 0000`) and a Terms of Service `'v2.4 (Effective 01 June 2026)'` that
 * appears nowhere in the legacy file — the real current version is `2.1`,
 * published `01 Jul`. A fabricated version number on a legal-consent pane is
 * not a cosmetic defect: it is the number an operator would quote.
 *
 * `pendingConsentCount` is the one field with no direct legacy literal. Legacy
 * derives it (`sendReconsentReminder`, `:3846`) by filtering riders and drivers
 * on `isConsentCurrent`; the counts below are that derivation's shape, seeded
 * as fixed numbers because `src/data/` has no ambient clock and no random.
 */

import { EYVAR_NOW } from '../mock/clock'
import type { WorkspaceSettings } from '../types/workspace'

export const workspaceSettingsFixture: WorkspaceSettings = {
  siteName: 'Eyvar',
  siteDescription:
    'Eyvar operations panel — manage subscriptions, drivers, riders, and dispatch.',
  supportEmail: 'support@eyvar.app',
  supportPhone: '+966 11 000 0000',
  timezone: 'Asia/Riyadh',
  currency: 'SAR',
  /* Legacy `branding.wordmark: 'eyvar'` (`:18388`), title-cased for display.
     The Arabic wordmark has no legacy store — the rail renders the English one
     in both languages today, which is a content gap reported to
     product-designer rather than invented here. */
  brandNameEn: 'Eyvar',
  brandNameAr: 'إيفار',
  /* `logoDataUrl: ''` and `logoUrl: ''` in both legacy stores. `null`, not the
     empty string the legacy code then tests for truthiness in four places. */
  logo: {
    dataUrl: null,
    fileName: null,
    sizeBytes: null,
    updatedAt: null,
  },
  legalDocuments: [
    {
      key: 'tos',
      labelKey: 'admin.workspace.legal.tos',
      currentVersion: '2.1',
      publishedOn: '2026-07-01',
      pendingConsentCount: 214,
    },
    {
      key: 'privacy',
      labelKey: 'admin.workspace.legal.privacy',
      currentVersion: '1.3',
      publishedOn: '2026-06-10',
      pendingConsentCount: 68,
    },
    {
      key: 'driverAgreement',
      labelKey: 'admin.workspace.legal.driverAgreement',
      currentVersion: '3.0',
      publishedOn: '2026-07-01',
      /* Zero is a real, reachable value and it is not the same as "no data".
         Every captain is current on v3.0, so the queue action is legal and
         answers `0` rather than being refused. */
      pendingConsentCount: 0,
    },
  ],
  updatedAt: EYVAR_NOW,
  updatedBy: 'USR-1',
}
