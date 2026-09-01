/**
 * Workspace settings — Admin › Workspace, route row `admin-workspace`
 * (`fixtures/routeTable.ts:733`), which merges the legacy `general`,
 * `branding` and `legal` panes.
 *
 * ## The merge is the point, and it closes a real defect
 *
 * The route row says so in as many words: *"`general` + `branding` merge closes
 * a real defect: two logo stores never synchronised."* They are both in the
 * legacy file and they disagree about everything:
 *
 *   `DB.opsConfig.general.logoDataUrl` (`:2570`)  a data URL, capped at 200 KB
 *                                                 (`:7964`), drives the favicon
 *                                                 and the settings preview
 *   `DB.branding.logoUrl` (`:18388`)              a URL, capped at 12 MB
 *                                                 (`:20994`), drives the rail
 *
 * Nothing copied one to the other. Upload a logo in Settings › General and the
 * rail kept the old one; set one in Branding and the favicon kept the old one.
 *
 * **There is one `logo` field here and there will not be a second.** The cap is
 * the smaller of the two, because the larger one was never enforced on the
 * store the favicon reads.
 */

import type { IsoDateTime } from './common'

/** The legacy 200 KB ceiling (`:7964`), which is the one that was actually enforced. */
export const MAX_LOGO_BYTES = 200 * 1024

/** Legacy `cfg-gen-tz` options. Kept as ids, never as display strings. */
export type WorkspaceTimezone = 'Asia/Riyadh' | 'Asia/Dubai' | 'Europe/London'

/** Legacy `cfg-gen-currency`. `CurrencyCode` in `common.ts` is SAR-only by design; this is the *setting*. */
export type WorkspaceCurrency = 'SAR' | 'AED'

/**
 * The single logo. `dataUrl` is `null` when none has been uploaded — legacy
 * seeds `logoDataUrl: ''` and then tests it for truthiness in four places, which
 * is how an empty string became a sentinel nobody typed.
 */
export interface WorkspaceLogo {
  dataUrl: string | null
  /** For the `Replace`/`Remove` line. `null` alongside a `null` `dataUrl`. */
  fileName: string | null
  sizeBytes: number | null
  updatedAt: IsoDateTime | null
}

/**
 * One legal document and the version currently in force.
 *
 * Legacy models this properly — `DB.legalDocuments` (`:13867`) carries
 * `currentVersion` plus a `versions[]` history — and the rebuilt screen had
 * regressed it to a free-text input holding `'v2.4 (Effective 01 June 2026)'`,
 * a version that exists nowhere in the legacy data. The structure comes back;
 * the history does not, because nothing on this screen renders it yet and a
 * field with no reader is a field that goes stale.
 */
export interface LegalDocument {
  key: 'tos' | 'privacy' | 'driverAgreement'
  labelKey: string
  currentVersion: string
  publishedOn: string
  /**
   * How many accounts are on an older version and would receive a re-consent
   * prompt. Legacy computes it by walking riders and drivers against
   * `isConsentCurrent` (`:3846`); it is served here because the count is what
   * the confirmation has to state, and a button that says *"queued for all
   * active accounts"* without a number is the bare toast this replaces.
   */
  pendingConsentCount: number
}

export interface WorkspaceSettings {
  /** Legacy `general.companyName` (`:2570`). Drives `<title>` through `applySiteBranding`. */
  siteName: string
  /** Legacy `general.siteDescription`. The meta description. */
  siteDescription: string
  supportEmail: string
  supportPhone: string
  timezone: WorkspaceTimezone
  currency: WorkspaceCurrency
  /** Legacy `branding.wordmark` (`:18388`), split per language because the rail renders one. */
  brandNameEn: string
  brandNameAr: string
  logo: WorkspaceLogo
  legalDocuments: readonly LegalDocument[]
  updatedAt: IsoDateTime | null
  updatedBy: string | null
}

/** What `updateWorkspaceSettings` accepts. `logo` and `legalDocuments` have their own operations. */
export type WorkspaceSettingsPatch = Partial<
  Omit<WorkspaceSettings, 'logo' | 'legalDocuments' | 'updatedAt' | 'updatedBy'>
>

/** What `queueReconsent` answers with, so the toast can state a number rather than a claim. */
export interface ReconsentResult {
  documentKey: LegalDocument['key']
  version: string
  queued: number
}
